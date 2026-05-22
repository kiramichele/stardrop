import { requireTeacher } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { AppShell } from "@/components/layout/AppShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = asProfile(await requireTeacher());
  return <AppShell user={user}>{children}</AppShell>;
}
