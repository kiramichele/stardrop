import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  MessagesSquare,
  Library,
  Calendar,
  Award,
  Trophy,
  BookMarked,
  Presentation,
  UserRound,
  BarChart3,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

// Shared navigation config — used by both the desktop Sidebar and the
// mobile drawer so the two never drift apart.

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const teacherNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
  { label: "Classes", href: "/teacher/classes", icon: Users },
  { label: "Roster", href: "/teacher/students", icon: UserRound },
  { label: "Lessons", href: "/teacher/lessons", icon: BookOpen },
  { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
  { label: "Slideshows", href: "/slideshows", icon: Presentation },
  { label: "Showcase", href: "/showcase", icon: Gamepad2 },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Assets", href: "/assets", icon: Library },
  { label: "Glossary", href: "/teacher/glossary", icon: BookMarked, comingSoon: true },
];

export const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Lessons", href: "/student/lessons", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
  { label: "Grades", href: "/student/grades", icon: Award },
  { label: "Achievements", href: "/student/achievements", icon: Trophy },
  { label: "Slideshows", href: "/slideshows", icon: Presentation },
  { label: "Showcase", href: "/showcase", icon: Gamepad2 },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Assets", href: "/assets", icon: Library },
  { label: "Glossary", href: "/student/glossary", icon: BookMarked, comingSoon: true },
];
