import { requireFullTeacher } from "@/lib/auth";
import { getStudentRosterGroups } from "@/lib/students-server";
import { getGradebookStatus } from "@/lib/gradebook-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { GradebookExport } from "@/components/students/GradebookExport";
import { RosterView } from "@/components/students/RosterView";

export default async function RosterPage() {
  await requireFullTeacher();

  const [groups, gradebookStatus] = await Promise.all([
    getStudentRosterGroups(),
    getGradebookStatus(),
  ]);
  const students = groups.flatMap((g) => g.students);

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description={`${students.length} ${
          students.length === 1 ? "student" : "students"
        } across all classes. Click anyone to open their full record.`}
      />
      <div className="mb-8">
        <GradebookExport
          hasTemplate={gradebookStatus.hasTemplate}
          filename={gradebookStatus.filename}
          uploadedAt={gradebookStatus.uploadedAt}
          report={gradebookStatus.report}
          parseError={gradebookStatus.parseError}
        />
      </div>
      <RosterView groups={groups} />
    </>
  );
}
