import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, ArrowLeftRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DemoSidebar } from "./DemoSidebar";
import type { DemoRole } from "@/lib/demo/fixtures";
import type { UserProfile } from "@/lib/profile";

interface DemoShellProps {
  role: DemoRole;
  user: UserProfile;
  children: ReactNode;
}

// The demo's chrome. Looks like the real AppShell, but the top bar swaps the
// notification bell + sign-out for a banner, a role switcher, and an exit link.
// Nothing here touches the database.
export function DemoShell({ role, user, children }: DemoShellProps) {
  const roleLabel = role === "teacher" ? "Teacher" : "Student";
  const otherRole: DemoRole = role === "teacher" ? "student" : "teacher";
  const otherHref = otherRole === "teacher" ? "/demo/teacher" : "/demo/student";
  const otherLabel = otherRole === "teacher" ? "teacher view" : "student view";

  return (
    <div className="flex min-h-screen">
      <DemoSidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo banner */}
        <div className="bg-honey-100 border-b border-honey-200 px-6 py-2 flex items-center gap-2 text-honey-900">
          <Sparkles className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <p className="text-sm font-medium">
            You&apos;re exploring a <strong>demo</strong> with made-up sample
            data — no real student information is shown.
          </p>
        </div>

        <header className="h-16 border-b border-wood-100/70 bg-cream-50/60 backdrop-blur-sm flex items-center justify-end px-6 gap-2">
          <Link
            href={otherHref}
            className="flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors duration-150 px-3 py-1.5 rounded-cozy hover:bg-cream-200"
            title={`Switch to the ${otherLabel}`}
          >
            <ArrowLeftRight className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Switch to {otherLabel}</span>
          </Link>

          <div className="flex items-center gap-3 px-2 py-1 rounded-cozy">
            <Avatar
              firstName={user.first_name}
              lastName={user.last_name}
              avatarUrl={user.avatar_url}
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-wood-900">
                {user.first_name} {user.last_name.charAt(0)}.
              </p>
              <p className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold">
                {roleLabel} · Demo
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors duration-150 px-3 py-1.5 rounded-cozy hover:bg-cream-200"
            title="Leave the demo"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Exit demo</span>
          </Link>
        </header>

        <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
