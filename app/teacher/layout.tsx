import { requireTeacher } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeacher();
  return <AppShell user={user}>{children}</AppShell>;
}