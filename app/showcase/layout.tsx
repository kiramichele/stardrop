import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { AppShell } from "@/components/layout/AppShell";

export default async function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = asProfile(await requireUser());
  return <AppShell user={user}>{children}</AppShell>;
}
