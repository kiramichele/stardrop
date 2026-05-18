import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  const role = user.role === "teacher" ? "teacher" : "student";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}