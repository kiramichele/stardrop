import Link from "next/link";
import { Heart, MessageCircle, Gamepad2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  publicShowcaseUrl,
  authorName,
  type ShowcaseProjectView,
} from "@/lib/showcase";

/**
 * Gallery tile for one project. Set `showStatus` on a student's own
 * projects to surface the Draft / Published badge.
 */
export function ProjectCard({
  project,
  showStatus = false,
}: {
  project: ShowcaseProjectView;
  showStatus?: boolean;
}) {
  const thumbnail = project.thumbnail_path
    ? publicShowcaseUrl(project.thumbnail_path)
    : null;

  return (
    <Link href={`/showcase/${project.id}`} className="group block">
      <div className="overflow-hidden rounded-cozy-lg border border-wood-100/70 bg-cream-50 shadow-cozy transition-shadow duration-200 hover:shadow-cozy-lg">
        <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-terracotta-100 to-honey-100">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Gamepad2 className="h-10 w-10 text-terracotta-300" strokeWidth={1.5} />
          )}
          {showStatus && (
            <span
              className={[
                "absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label",
                project.published
                  ? "bg-sage-100 text-sage-700 border-sage-200"
                  : "bg-cream-100 text-wood-500 border-wood-200",
              ].join(" ")}
            >
              {project.published ? "Published" : "Draft"}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="line-clamp-1 font-display text-lg leading-tight text-wood-900 transition-colors group-hover:text-terracotta-700">
            {project.title}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            <Avatar
              firstName={project.author.firstName}
              lastName={project.author.lastName}
              avatarUrl={project.author.avatarUrl}
              size="sm"
            />
            <span className="text-xs text-wood-600">
              {authorName(project.author)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-wood-500">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" strokeWidth={2} />
              {project.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              {project.commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
