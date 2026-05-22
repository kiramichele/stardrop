"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCw, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { shuffle, type GlossaryTerm } from "@/lib/exam-prep";

export function Flashcards({ terms }: { terms: GlossaryTerm[] }) {
  const [deck, setDeck] = useState<GlossaryTerm[]>(terms);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setFlipped(false);
      setIndex((i) => {
        const n = i + delta;
        if (n < 0) return deck.length - 1;
        if (n >= deck.length) return 0;
        return n;
      });
    },
    [deck.length]
  );

  function reshuffle() {
    setDeck(shuffle(terms));
    setIndex(0);
    setFlipped(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const card = deck[index];
  if (!card) return null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-wood-500 tabular-nums">
          Card {index + 1} of {deck.length}
        </p>
        <button
          type="button"
          onClick={reshuffle}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-wood-600 hover:text-terracotta-700 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Shuffle
        </button>
      </div>

      {/* The card — click anywhere to flip */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={[
          "w-full min-h-[15rem] rounded-cozy-lg border shadow-cozy p-8",
          "flex flex-col items-center justify-center text-center transition-colors",
          flipped
            ? "bg-cream-50 border-wood-200"
            : "bg-terracotta-50 border-terracotta-200",
        ].join(" ")}
      >
        {flipped ? (
          <>
            <p className="label-eyebrow text-terracotta-600 mb-3">
              Definition
            </p>
            <p className="text-base text-wood-800 leading-relaxed">
              {card.definition}
            </p>
          </>
        ) : (
          <>
            <p className="label-eyebrow text-wood-400 mb-3">Term</p>
            <p className="font-display text-2xl text-wood-900">{card.term}</p>
            <p className="mt-5 inline-flex items-center gap-1 text-xs text-wood-400">
              <RotateCw className="w-3 h-3" />
              Click to flip
            </p>
          </>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={() => go(-1)}>
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFlipped((f) => !f)}
        >
          <RotateCw className="w-4 h-4" />
          Flip
        </Button>
        <Button variant="secondary" size="sm" onClick={() => go(1)}>
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-center text-xs text-wood-400 mt-4">
        Tip: use ← → to move and Space to flip.
      </p>
    </div>
  );
}
