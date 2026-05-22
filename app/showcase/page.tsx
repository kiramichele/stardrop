import Link from "next/link";
import { Plus, Gamepad2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCard } from "@/components/showcase/ProjectCard";
import { getGalleryProjects, getMyProjects } from "@/lib/showcase-server";

export default async function ShowcasePage() {
  const user = await requireUser();
  const [gallery, mine] = await Promise.all([
    getGalleryProjects(user.id),
    getMyProjects(user.id),
  ]);

  // A student's own projects live in "Your projects"; keep them out of the
  // class gallery so they aren't listed twice.
  const fromClass = gallery.filter((p) => p.user_id !== user.id);

  return (
    <>
      <PageHeader
        eyebrow="Showcase"
        title="Project gallery"
        description="Play your classmates' Unity games right in the browser — then leave a like and some feedback."
        action={
          <Link href="/showcase/new">
            <Button>
              <Plus className="w-4 h-4" strokeWidth={2} />
              Share a project
            </Button>
          </Link>
        }
      />

      {mine.length > 0 && (
        <section className="mb-10">
          <h2 className="label-eyebrow mb-3">Your projects</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((p) => (
              <ProjectCard key={p.id} project={p} showStatus />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="label-eyebrow mb-3">From the class</h2>
        {fromClass.length === 0 ? (
          <Card>
            <EmptyState
              icon={Gamepad2}
              title="No projects shared yet"
              description="When classmates publish their Unity builds, they'll show up here to play."
              action={
                <Link href="/showcase/new">
                  <Button>Share a project</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fromClass.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
