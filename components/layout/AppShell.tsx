import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { UserProfile } from "@/lib/profile";

interface AppShellProps {
  children: ReactNode;
  user: UserProfile;
}

export function AppShell({ children, user }: AppShellProps) {
  const role = user.role === "teacher" ? "teacher" : "student";
  const limited = user.role === "teacher" && user.limited_staff;

  return (
    <div
      className={[
        "flex min-h-screen",
        user.reduced_motion ? "reduce-motion" : "",
      ].join(" ")}
    >
      <Sidebar role={role} limited={limited} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
