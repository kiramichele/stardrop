import { requireStudent } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { AppShell } from "@/components/layout/AppShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = asProfile(await requireStudent());
  return <AppShell user={user}>{children}</AppShell>;
}
