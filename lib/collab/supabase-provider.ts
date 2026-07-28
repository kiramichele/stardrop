import * as Y from "yjs";
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal Yjs provider over a Supabase Realtime broadcast channel.
 *
 * - Document edits: on a local `doc` update, broadcast the binary update
 *   (base64) to peers; inbound updates are applied with origin === this so
 *   they don't echo back out.
 * - Awareness (cursors/selections/names): broadcast/apply the same way.
 * - Late joiners: on subscribe we broadcast `sync-request`; every peer replies
 *   with its full document + awareness state so the newcomer catches up. The
 *   DB-persisted state is the base everyone loads before connecting.
 *
 * `broadcast.self = false` so we never receive our own messages.
 */

// Just the part of the supabase-js client we use (its exact channel signature,
// so any typed client instance is assignable).
type ChannelFactory = Pick<SupabaseClient, "channel">;

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private channel: RealtimeChannel;
  synced = false;

  constructor(
    client: ChannelFactory,
    channelName: string,
    doc: Y.Doc,
    awareness: Awareness
  ) {
    this.doc = doc;
    this.awareness = awareness;
    this.channel = client.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    doc.on("update", this.onDocUpdate);
    awareness.on("update", this.onAwarenessUpdate);

    this.channel
      .on("broadcast", { event: "yjs" }, ({ payload }) => {
        try {
          Y.applyUpdate(doc, fromB64(payload.u), this);
        } catch {
          /* ignore malformed */
        }
      })
      .on("broadcast", { event: "awareness" }, ({ payload }) => {
        try {
          applyAwarenessUpdate(awareness, fromB64(payload.u), this);
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "sync-request" }, () => {
        this.send("yjs", toB64(Y.encodeStateAsUpdate(doc)));
        const ids = Array.from(awareness.getStates().keys());
        if (ids.length > 0) {
          this.send("awareness", toB64(encodeAwarenessUpdate(awareness, ids)));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.synced = true;
          this.send("sync-request", "");
        }
      });

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnload);
    }
  }

  private send(event: string, u: string) {
    void this.channel.send({ type: "broadcast", event, payload: { u } });
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // came from a peer — don't echo
    this.send("yjs", toB64(update));
  };

  private onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return;
    const ids = [...changes.added, ...changes.updated, ...changes.removed];
    this.send("awareness", toB64(encodeAwarenessUpdate(this.awareness, ids)));
  };

  private beforeUnload = () => {
    removeAwarenessStates(this.awareness, [this.doc.clientID], "unload");
  };

  destroy() {
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnload);
    }
    removeAwarenessStates(this.awareness, [this.doc.clientID], "destroy");
    void this.channel.unsubscribe();
  }
}
