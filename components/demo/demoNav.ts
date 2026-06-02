import {
  LayoutDashboard,
  BarChart3,
  UserRound,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  Award,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import type { DemoRole } from "@/lib/demo/fixtures";

// Navigation for the curated demo tour. Every href stays inside /demo so a
// visitor can never click their way out into a real, login-gated route.

export type DemoNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const teacherDemoNav: DemoNavItem[] = [
  { label: "Dashboard", href: "/demo/teacher", icon: LayoutDashboard },
  { label: "Analytics", href: "/demo/teacher/analytics", icon: BarChart3 },
  { label: "Roster", href: "/demo/teacher/students", icon: UserRound },
  { label: "Assignments", href: "/demo/teacher/assignments", icon: ClipboardList },
  { label: "Grading", href: "/demo/teacher/grading", icon: ClipboardCheck },
];

export const studentDemoNav: DemoNavItem[] = [
  { label: "Dashboard", href: "/demo/student", icon: LayoutDashboard },
  { label: "Lessons", href: "/demo/student/lessons", icon: BookOpen },
  { label: "Assignments", href: "/demo/student/assignments", icon: ClipboardList },
  { label: "Grades", href: "/demo/student/grades", icon: Award },
  { label: "Discussions", href: "/demo/student/discussions", icon: MessagesSquare },
];

export function demoNavFor(role: DemoRole): DemoNavItem[] {
  return role === "teacher" ? teacherDemoNav : studentDemoNav;
}
