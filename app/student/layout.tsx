import { requireStudent } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStudent();
  return <AppShell user={user}>{children}</AppShell>;
}