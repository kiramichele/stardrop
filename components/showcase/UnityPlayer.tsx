"use client";

import { useRef, useState } from "react";
import { Play, Maximize2 } from "lucide-react";

/**
 * In-browser player for a Unity WebGL build. The iframe is mounted only
 * after the student clicks Play, so opening a project page doesn't kick
 * off a heavy WebGL download until they actually want it.
 */
export function UnityPlayer({ src, title }: { src: string; title: string }) {
  const [started, setStarted] = useState(false);
  const frameWrap = useRef<HTMLDivElement>(null);

  function goFullscreen() {
    frameWrap.current?.requestFullscreen();
  }

  return (
    <div className="overflow-hidden rounded-cozy-lg border border-wood-100/70 shadow-cozy">
      <div ref={frameWrap} className="relative aspect-video bg-black">
        {started ? (
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; gamepad; microphone; clipboard-write"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-terracotta-700 to-wood-800 text-cream-50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-50/15 ring-2 ring-cream-50/40 transition-transform duration-200 group-hover:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 fill-current" />
            </span>
            <span className="font-display text-xl">Play {title}</span>
            <span className="text-xs text-cream-200/80">
              Loads the game right here in your browser
            </span>
          </button>
        )}
      </div>

      {started && (
        <div className="flex items-center justify-between gap-2 bg-wood-800 px-3 py-2">
          <p className="text-xs text-cream-200/70">
            Running in-browser · click the game to play
          </p>
          <button
            type="button"
            onClick={goFullscreen}
            className="inline-flex items-center gap-1 text-xs text-cream-100 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
