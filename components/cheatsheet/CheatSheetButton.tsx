import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * Opens the C#/Unity cheat sheet in a new tab — dropped next to every code
 * editor (Playground, code assignments) so it's always in reach without
 * losing whatever's in the editor.
 */
export function CheatSheetButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/cheatsheet"
      target="_blank"
      rel="noopener noreferrer"
      title="Open the C# & Unity cheat sheet in a new tab"
      className={[
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-cozy border border-wood-200 bg-cream-50 text-sm text-wood-700 hover:border-terracotta-300 hover:text-terracotta-700 hover:bg-cream-100 transition-colors flex-shrink-0",
        className,
      ].join(" ")}
    >
      <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
      Cheat sheet
    </Link>
  );
}
