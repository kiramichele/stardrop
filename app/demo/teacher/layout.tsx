import { DemoShell } from "@/components/demo/DemoShell";
import { DEMO_TEACHER } from "@/lib/demo/fixtures";

export default function DemoTeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoShell role="teacher" user={DEMO_TEACHER}>
      {children}
    </DemoShell>
  );
}
