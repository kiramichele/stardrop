"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Presentation,
  Calendar,
  Award,
  PartyPopper,
  Compass,
  X,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markOnboarded } from "@/app/student/actions";

type Step = { icon: LucideIcon; title: string; body: string };

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to Stardrop!",
    body: "This is your hub for Game Design class. Here's a quick 60-second tour of how everything works.",
  },
  {
    icon: LayoutDashboard,
    title: "Your dashboard",
    body: 'This page is home base. The "Today" card shows the day\'s plan — what you\'re doing in class and anything that\'s due.',
  },
  {
    icon: BookOpen,
    title: "Lessons",
    body: 'Click Lessons in the menu on the left. Lessons are grouped by unit — open one to read it, then hit "Mark complete" when you finish.',
  },
  {
    icon: ClipboardList,
    title: "Assignments",
    body: "Click Assignments to see your work, grouped by unit. Open one, do it in the editor, and press Submit when you're ready — you can save a draft and come back later.",
  },
  {
    icon: Presentation,
    title: "Slideshows",
    body: "Click Slideshows for the slides from each class day, organized by date. Missed a day? This is where to catch up.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    body: "The Calendar shows the whole school year and the daily bell schedule. Click any day to see what was planned for it.",
  },
  {
    icon: Award,
    title: "Grades & Discussions",
    body: "Check Grades anytime for your scores and average. Discussions are class message boards where you can post and reply to classmates.",
  },
  {
    icon: PartyPopper,
    title: "You're all set!",
    body: 'That\'s the tour. You can replay it whenever you want with the "Replay tour" button on your dashboard.',
  },
];

export function StudentOrientation({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(0);

  function finish() {
    setOpen(false);
    setStep(0);
    void markOnboarded();
  }

  function openTour() {
    setStep(0);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openTour}>
        <Compass className="w-4 h-4" strokeWidth={2} />
        Replay tour
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-wood-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Stardrop orientation"
            className="bg-cream-50 rounded-cozy-lg shadow-cozy-lg border border-wood-100 w-full max-w-md animate-fade-in-up"
          >
            <div className="flex justify-end p-3 pb-0">
              <button
                type="button"
                onClick={finish}
                aria-label="Skip tour"
                className="w-8 h-8 inline-flex items-center justify-center rounded-cozy text-wood-400 hover:bg-cream-200 hover:text-wood-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-7 pb-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-terracotta-100 text-terracotta-700 flex items-center justify-center">
                <Icon className="w-7 h-7" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-xl text-wood-900 mt-3">
                {current.title}
              </h2>
              <p className="text-sm text-wood-600 mt-1.5 leading-relaxed">
                {current.body}
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-4">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={[
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === step ? "bg-terracotta-500" : "bg-wood-200",
                  ].join(" ")}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-wood-100">
              <button
                type="button"
                onClick={finish}
                className="text-xs text-wood-500 hover:text-wood-700 transition-colors"
              >
                {isLast ? "Close" : "Skip tour"}
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                    Back
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={finish}>
                    Get started
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setStep(step + 1)}>
                    Next
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
