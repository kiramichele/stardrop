import Link from "next/link";
import { GraduationCap, UserRound, ArrowRight } from "lucide-react";

// Public demo chooser. Lets a visitor pick which side of Stardrop to explore.
// Pure presentation — no auth, no database.
export default function DemoLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-terracotta-700 leading-none">
            Stardrop
          </h1>
          <p className="label-eyebrow mt-3">Interactive demo</p>
          <p className="text-wood-600 mt-4 max-w-md mx-auto">
            Explore both sides of the classroom with made-up sample data. Nothing
            here is real student information.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/demo/teacher" className="block group">
            <div className="h-full bg-cream-50 rounded-cozy-lg border border-wood-100/70 shadow-cozy p-7 transition-shadow duration-200 hover:shadow-cozy-lg">
              <div className="w-12 h-12 rounded-cozy bg-terracotta-100 text-terracotta-700 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-xl text-wood-900">Teacher view</h2>
              <p className="text-sm text-wood-600 mt-1.5">
                Roster, analytics, assignments, and the grading queue.
              </p>
              <p className="text-sm text-terracotta-700 mt-4 inline-flex items-center gap-1 font-medium">
                Explore <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </Link>

          <Link href="/demo/student" className="block group">
            <div className="h-full bg-cream-50 rounded-cozy-lg border border-wood-100/70 shadow-cozy p-7 transition-shadow duration-200 hover:shadow-cozy-lg">
              <div className="w-12 h-12 rounded-cozy bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
                <UserRound className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-xl text-wood-900">Student view</h2>
              <p className="text-sm text-wood-600 mt-1.5">
                Lessons, assignments with a code editor, grades, and discussions.
              </p>
              <p className="text-sm text-sage-700 mt-4 inline-flex items-center gap-1 font-medium">
                Explore <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/login"
            className="text-sm text-wood-500 hover:text-terracotta-700 transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
