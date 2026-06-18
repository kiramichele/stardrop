import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProgramsForUser } from "@/lib/playground-server";
import { getCodeSubmissionsForGist } from "@/lib/starhub-server";
import { getMyProjects } from "@/lib/showcase-server";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddToStarhubPicker,
  type ShowcaseChoice,
} from "@/components/starhub/AddToStarhubPicker";

export default async function NewStarhubEntryPage() {
  const user = await requireUser();
  const [programs, submissions, projects] = await Promise.all([
    getProgramsForUser(user.id),
    getCodeSubmissionsForGist(user.id),
    getMyProjects(user.id),
  ]);

  const showcaseChoices: ShowcaseChoice[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    // showcase_projects uses `published`, mapped here so StarHub doesn't
    // have to know that field name.
    isPublic: p.published,
  }));

  return (
    <>
      <PageHeader
        eyebrow="StarHub"
        title="Add to my StarHub"
        description="Feature work you've already made — pick a saved Playground program, a code-assignment submission, or a Showcase project."
      />
      <AddToStarhubPicker
        username={user.username}
        programs={programs}
        submissions={submissions}
        showcaseProjects={showcaseChoices}
      />
      <p className="text-sm text-wood-500 mt-5 max-w-3xl">
        Want a free-form code snippet that isn&apos;t tied to any of the
        above? Save it in the{" "}
        <Link
          href="/playground"
          className="text-terracotta-700 hover:text-terracotta-800 font-medium"
        >
          Playground
        </Link>{" "}
        first, then come back to add it.
      </p>
    </>
  );
}
