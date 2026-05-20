"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  MessagesSquare,
  Library,
  Calendar,
  Award,
  BookMarked,
  Presentation,
  UserRound,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

const teacherNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
  { label: "Classes", href: "/teacher/classes", icon: Users },
  { label: "Roster", href: "/teacher/students", icon: UserRound },
  { label: "Lessons", href: "/teacher/lessons", icon: BookOpen },
  { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
  { label: "Slideshows", href: "/slideshows", icon: Presentation },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Resources", href: "/teacher/resources", icon: Library, comingSoon: true },
  { label: "Glossary", href: "/teacher/glossary", icon: BookMarked, comingSoon: true },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Lessons", href: "/student/lessons", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
  { label: "Grades", href: "/student/grades", icon: Award },
  { label: "Slideshows", href: "/slideshows", icon: Presentation },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Resources", href: "/student/resources", icon: Library, comingSoon: true },
  { label: "Glossary", href: "/student/glossary", icon: BookMarked, comingSoon: true },
];

interface SidebarProps {
  role: "teacher" | "student";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = role === "teacher" ? teacherNav : studentNav;

  return (
    <aside className="hidden md:flex w-60 flex-col bg-cream-50/80 backdrop-blur-sm border-r border-wood-100/70">
      <div className="px-6 py-6">
        <Link
          href={role === "teacher" ? "/teacher" : "/student"}
          className="block"
        >
          <h1 className="font-display text-2xl text-terracotta-700 leading-none">
            Stardrop
          </h1>
          <p className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 mt-1.5 font-semibold">
            Game Design
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-cozy text-wood-400 cursor-not-allowed"
                title="Coming soon"
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-[0.65rem] uppercase tracking-wide-label">
                  soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-cozy text-sm transition-colors duration-150",
                isActive
                  ? "bg-terracotta-100/70 text-terracotta-800 font-semibold"
                  : "text-wood-700 hover:bg-cream-200 hover:text-wood-900",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-wood-100/70">
        <p className="text-[0.7rem] text-wood-400">v1 · Phase 2 in progress</p>
      </div>
    </aside>
  );
}