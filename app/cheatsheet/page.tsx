import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheatSheetContent, BackToTop } from "@/components/cheatsheet/CheatSheetContent";

export default function CheatSheetPage() {
  return (
    <div id="top">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
            Reference
          </span>
        }
        title="C# & Unity cheat sheet"
        description="Variables, control flow, classes, and every MonoBehaviour method — everything on one page. Ctrl/⌘+F to jump straight to what you need."
      />
      <CheatSheetContent />
      <div className="mt-10 pt-6 border-t border-wood-100">
        <BackToTop />
      </div>
    </div>
  );
}
