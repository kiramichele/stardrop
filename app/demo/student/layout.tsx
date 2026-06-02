import { DemoShell } from "@/components/demo/DemoShell";
import { DEMO_VIEWER_STUDENT, demoStudentProfile } from "@/lib/demo/fixtures";

export default function DemoStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoShell role="student" user={demoStudentProfile(DEMO_VIEWER_STUDENT)}>
      {children}
    </DemoShell>
  );
}
