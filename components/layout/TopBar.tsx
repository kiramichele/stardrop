import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "./NotificationBell";
import { MobileNav } from "./MobileNav";
import type { UserProfile } from "@/lib/profile";

interface TopBarProps {
  user: UserProfile;
}

export function TopBar({ user }: TopBarProps) {
  const roleLabel = user.role === "teacher" ? "Teacher" : "Student";

  return (
    <header className="h-16 border-b border-wood-100/70 bg-cream-50/60 backdrop-blur-sm flex items-center justify-end px-6 gap-2">
      <MobileNav role={user.role === "teacher" ? "teacher" : "student"} />
      <NotificationBell userId={user.id} />
      <Link
        href="/profile"
        className="flex items-center gap-3 px-2 py-1 rounded-cozy hover:bg-cream-200 transition-colors"
        title="Your profile"
      >
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
            {roleLabel}
          </p>
        </div>
      </Link>

      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors duration-150 px-3 py-1.5 rounded-cozy hover:bg-cream-200"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </header>
  );
}
