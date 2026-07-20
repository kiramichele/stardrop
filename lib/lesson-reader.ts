/**
 * Reader snippet injected into lesson HTML by the lessons proxy route when
 * the request carries `?reader=1` (i.e. a student viewing the lesson, not a
 * teacher preview or a raw fetch).
 *
 * It runs INSIDE the sandboxed iframe (opaque origin, no allow-same-origin),
 * so it cannot touch Stardrop's session — the security model is unchanged.
 * It talks to the parent page only via postMessage, and only after the
 * parent sends `reader:init` (which carries a nonce echoed on every reply
 * and the parent's real origin, captured for targeted replies).
 *
 * Responsibilities:
 *   - Highlighting: selection toolbar with color swatches; wraps the
 *     selection in <mark> anchored by character offsets over the body's
 *     text content; re-applies saved highlights on init; supports removal.
 *   - Read-aloud of a selection: forwards the selected text to the parent,
 *     which owns the <audio> element and the ElevenLabs call.
 *
 * Offsets are measured excluding the reader's own injected DOM (everything
 * tagged data-sd-reader), so creation and rehydration share one coordinate
 * space that ignores the toolbar/marks structure.
 */
export const READER_SNIPPET = `
<style data-sd-reader>
  mark.sd-hl { border-radius: 2px; padding: 0 1px; cursor: pointer; color: inherit; }
  mark.sd-hl[data-hl-color="yellow"] { background: #ffe8a3; }
  mark.sd-hl[data-hl-color="green"]  { background: #b8e6c1; }
  mark.sd-hl[data-hl-color="pink"]   { background: #ffc7dd; }
  mark.sd-hl[data-hl-color="blue"]   { background: #bcd9ff; }
  #sd-reader-toolbar {
    position: fixed; z-index: 2147483647; display: none;
    gap: 4px; align-items: center; padding: 5px 6px;
    background: #2b2320; border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.28);
    font-family: system-ui, sans-serif;
  }
  #sd-reader-toolbar button {
    all: unset; cursor: pointer; width: 20px; height: 20px;
    border-radius: 50%; box-sizing: border-box;
    display: inline-flex; align-items: center; justify-content: center;
  }
  #sd-reader-toolbar .sd-swatch { border: 2px solid rgba(255,255,255,0.35); }
  #sd-reader-toolbar .sd-swatch[data-c="yellow"] { background:#ffe8a3; }
  #sd-reader-toolbar .sd-swatch[data-c="green"]  { background:#b8e6c1; }
  #sd-reader-toolbar .sd-swatch[data-c="pink"]   { background:#ffc7dd; }
  #sd-reader-toolbar .sd-swatch[data-c="blue"]   { background:#bcd9ff; }
  #sd-reader-toolbar .sd-action {
    width: auto; height: 22px; padding: 0 8px; color: #fff;
    font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.12);
  }
  #sd-reader-toolbar .sd-action:hover { background: rgba(255,255,255,0.22); }
</style>
<script data-sd-reader>
(function () {
  "use strict";
  var parentOrigin = null;   // real parent origin, captured from init
  var nonce = null;          // shared secret echoed on every reply
  var ttsEnabled = false;    // whether read-aloud is configured on the host
  var toolbar = null;
  var lastRange = null;      // last non-collapsed selection range
  var activeHighlightId = null; // id of highlight clicked for removal

  function isReaderNode(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !!(el && el.closest("[data-sd-reader]"));
  }

  // Character length of a range over the body text, excluding reader DOM.
  function textLengthOfRange(range) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return isReaderNode(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var len = 0, node;
    while ((node = walker.nextNode())) {
      if (!range.intersectsNode(node)) continue;
      var from = 0, to = node.nodeValue.length;
      if (node === range.startContainer) from = range.startOffset;
      if (node === range.endContainer) to = range.endOffset;
      if (to > from) len += to - from;
    }
    return len;
  }

  // Char index from body start to a boundary point (container, offset).
  function charIndexOf(container, offset) {
    var r = document.createRange();
    r.selectNodeContents(document.body);
    try { r.setEnd(container, offset); } catch (e) { return 0; }
    return textLengthOfRange(r);
  }

  // Map a char offset back to a {node, offset} position in the text space.
  function positionAt(offset) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return isReaderNode(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var acc = 0, node, last = null;
    while ((node = walker.nextNode())) {
      var len = node.nodeValue.length;
      if (offset <= acc + len) return { node: node, offset: offset - acc };
      acc += len;
      last = node;
    }
    return last ? { node: last, offset: last.nodeValue.length } : null;
  }

  function normalizeWs(s) { return (s || "").replace(/\\s+/g, " ").trim(); }

  // Wrap one text node's [from,to) slice in a highlight mark.
  function wrapPortion(node, from, to, id, color) {
    if (to < node.nodeValue.length) node.splitText(to);
    var target = node;
    if (from > 0) target = node.splitText(from);
    var mark = document.createElement("mark");
    mark.className = "sd-hl";
    mark.setAttribute("data-hl-id", id);
    mark.setAttribute("data-hl-color", color);
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
    return mark;
  }

  // Apply a highlight over [start,end) offsets. Returns true on success.
  function applyHighlight(id, start, end, color, expectedQuote) {
    var s = positionAt(start), e = positionAt(end);
    if (!s || !e) return false;
    var range = document.createRange();
    try {
      range.setStart(s.node, s.offset);
      range.setEnd(e.node, e.offset);
    } catch (err) { return false; }
    if (range.collapsed) return false;
    if (expectedQuote && normalizeWs(range.toString()) !== normalizeWs(expectedQuote)) {
      return false; // content drifted since the highlight was saved
    }
    // Collect intersecting text nodes first (splitting mutates the tree).
    var walker = document.createTreeWalker(
      range.commonAncestorContainer.nodeType === 3
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (n) {
          if (isReaderNode(n)) return NodeFilter.FILTER_REJECT;
          return range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    if (range.startContainer.nodeType === 3 && nodes.indexOf(range.startContainer) === -1) {
      nodes.unshift(range.startContainer);
    }
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var from = n === range.startContainer ? range.startOffset : 0;
      var to = n === range.endContainer ? range.endOffset : n.nodeValue.length;
      if (to > from) wrapPortion(n, from, to, id, color);
    }
    return true;
  }

  function unwrapHighlight(id) {
    var marks = document.querySelectorAll('mark.sd-hl[data-hl-id="' + cssEscape(id) + '"]');
    marks.forEach(function (m) {
      var parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  function retagHighlight(tempId, realId) {
    var marks = document.querySelectorAll('mark.sd-hl[data-hl-id="' + cssEscape(tempId) + '"]');
    marks.forEach(function (m) { m.setAttribute("data-hl-id", realId); });
  }

  function cssEscape(s) { return String(s).replace(/["\\\\]/g, "\\\\$&"); }

  function post(type, payload) {
    if (!parentOrigin || !nonce) return;
    var msg = { source: "sd-reader", type: type, nonce: nonce };
    if (payload) for (var k in payload) msg[k] = payload[k];
    window.parent.postMessage(msg, parentOrigin);
  }

  // ---- Toolbar -------------------------------------------------------
  var COLORS = ["yellow", "green", "pink", "blue"];

  function buildToolbar() {
    toolbar = document.createElement("div");
    toolbar.id = "sd-reader-toolbar";
    toolbar.setAttribute("data-sd-reader", "");
    // Keep selection alive when interacting with the toolbar.
    toolbar.addEventListener("mousedown", function (e) { e.preventDefault(); });
    document.body.appendChild(toolbar);
  }

  function showSelectionToolbar(rect) {
    toolbar.innerHTML = "";
    COLORS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "sd-swatch";
      b.setAttribute("data-c", c);
      b.title = "Highlight " + c;
      b.addEventListener("click", function () { createHighlight(c); });
      toolbar.appendChild(b);
    });
    if (ttsEnabled) {
      var speak = document.createElement("button");
      speak.className = "sd-action";
      speak.textContent = "Read aloud";
      speak.addEventListener("click", function () { speakSelection(); });
      toolbar.appendChild(speak);
    }
    placeToolbar(rect);
  }

  function showRemoveToolbar(rect, id) {
    activeHighlightId = id;
    toolbar.innerHTML = "";
    var rm = document.createElement("button");
    rm.className = "sd-action";
    rm.textContent = "Remove highlight";
    rm.addEventListener("click", function () {
      unwrapHighlight(id);
      post("highlight:remove", { id: id });
      hideToolbar();
    });
    toolbar.appendChild(rm);
    placeToolbar(rect);
  }

  function placeToolbar(rect) {
    toolbar.style.display = "flex";
    var top = rect.top - toolbar.offsetHeight - 8;
    if (top < 4) top = rect.bottom + 8;
    var left = rect.left + rect.width / 2 - toolbar.offsetWidth / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - toolbar.offsetWidth - 4));
    toolbar.style.top = top + "px";
    toolbar.style.left = left + "px";
  }

  function hideToolbar() {
    if (toolbar) toolbar.style.display = "none";
    activeHighlightId = null;
  }

  // ---- Actions -------------------------------------------------------
  function createHighlight(color) {
    if (!lastRange) return;
    var range = lastRange;
    var start = charIndexOf(range.startContainer, range.startOffset);
    var end = charIndexOf(range.endContainer, range.endOffset);
    if (end < start) { var t = start; start = end; end = t; }
    var quote = normalizeWs(range.toString());
    if (end <= start || !quote) { hideToolbar(); return; }
    var tempId = "tmp-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
    if (applyHighlight(tempId, start, end, color, null)) {
      post("highlight:add", {
        tempId: tempId, startOffset: start, endOffset: end, quote: quote, color: color,
      });
    }
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    lastRange = null;
    hideToolbar();
  }

  function speakSelection() {
    if (!lastRange) return;
    var text = lastRange.toString();
    if (text.trim()) post("tts:speak", { text: text });
    hideToolbar();
  }

  // ---- Events --------------------------------------------------------
  document.addEventListener("mouseup", function (e) {
    if (toolbar && toolbar.contains(e.target)) return;
    // Click on an existing highlight (no active selection) -> remove UI.
    var mark = e.target && e.target.closest ? e.target.closest("mark.sd-hl") : null;
    var sel = window.getSelection();
    var hasSelection = sel && sel.rangeCount && !sel.isCollapsed && normalizeWs(sel.toString());
    if (hasSelection) {
      lastRange = sel.getRangeAt(0).cloneRange();
      showSelectionToolbar(lastRange.getBoundingClientRect());
    } else if (mark) {
      showRemoveToolbar(mark.getBoundingClientRect(), mark.getAttribute("data-hl-id"));
    } else {
      hideToolbar();
    }
  });

  document.addEventListener("mousedown", function (e) {
    if (toolbar && toolbar.contains(e.target)) return;
    hideToolbar();
  });
  window.addEventListener("scroll", hideToolbar, true);

  // ---- Parent messaging ---------------------------------------------
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var data = e.data;
    if (!data || data.source !== "sd-host") return;
    if (data.type === "reader:init") {
      parentOrigin = e.origin;
      nonce = data.nonce;
      ttsEnabled = !!data.ttsEnabled;
      if (!toolbar) buildToolbar();
      if (Array.isArray(data.highlights)) {
        data.highlights.forEach(function (h) {
          applyHighlight(h.id, h.start_offset, h.end_offset, h.color, h.quote);
        });
      }
    } else if (data.nonce !== nonce) {
      return; // reject anything not carrying our nonce
    } else if (data.type === "highlight:added") {
      retagHighlight(data.tempId, data.id);
    } else if (data.type === "highlight:rejected") {
      unwrapHighlight(data.tempId);
    }
  });

  // Announce readiness so the parent (re)sends init if it loaded first.
  try { window.parent.postMessage({ source: "sd-reader", type: "reader:ready" }, "*"); } catch (err) {}
})();
</script>
`;
