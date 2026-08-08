import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStudentRosterGroups } from "@/lib/students-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { RosterView } from "@/components/students/RosterView";

export default async function StarHubRootPage() {
  const user = await requireUser();

  // Teachers don't have a portfolio of their own — land them on a
  // by-class directory of their students' StarHub profiles instead.
  if (user.role === "teacher") {
    const groups = await getStudentRosterGroups();
    return (
      <>
        <PageHeader
          eyebrow="StarHub"
          title="Student portfolios"
          description="Browse by class, then open a student's page to see their public work."
        />
        <RosterView groups={groups} linkTo="starhub" />
      </>
    );
  }

  redirect(`/starhub/${user.username}`);
}
