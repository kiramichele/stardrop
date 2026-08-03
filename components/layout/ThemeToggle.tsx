"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

// The source of truth is the `data-theme` attribute on <html>, first set by
// the no-flash script in the root layout. We read it via useSyncExternalStore
// (which also sidesteps hydration mismatches) and watch it for changes.

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // With no explicit choice yet, keep following the OS preference live.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.setAttribute(
        "data-theme",
        mq.matches ? "dark" : "light"
      );
    }
  };
  mq.addEventListener("change", onSystem);

  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onSystem);
  };
}

const getServerSnapshot = (): Theme => "light";

/** Per-device light/dark switch for the top bar. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    currentTheme,
    getServerSnapshot
  );
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    // Mutating the attribute notifies the observer above → re-render.
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — the switch still works this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-9 h-9 rounded-cozy text-wood-600 hover:text-terracotta-700 hover:bg-cream-200 transition-colors duration-150"
    >
      {isDark ? (
        <Sun className="w-4 h-4" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
