import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/showcase-server";
import {
  publicShowcaseUrl,
  authorName,
  formatShowcaseDate,
} from "@/lib/showcase";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { UnityPlayer } from "@/components/showcase/UnityPlayer";
import { LikeButton } from "@/components/showcase/LikeButton";
import { CommentSection } from "@/components/showcase/CommentSection";
import { OwnerControls } from "@/components/showcase/OwnerControls";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  const data = await getProjectDetail(projectId, user.id);
  if (!data) notFound();
  const { project, comments } = data;

  const isOwner = project.user_id === user.id;
  const isTeacher = user.role === "teacher";
  const canManage = isOwner || isTeacher;

  // A draft is visible only to its owner and to teachers.
  if (!project.published && !canManage) notFound();

  return (
    <div className="max-w-3xl animate-fade-in-up">
      <Link
        href="/showcase"
        className="mb-4 inline-flex items-center gap-1 text-sm text-wood-500 transition-colors hover:text-terracotta-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to gallery
      </Link>

      {!project.published && canManage && (
        <div className="mb-4 rounded-cozy border border-honey-300 bg-honey-50 px-4 py-3 text-sm text-wood-700">
          {project.index_path
            ? "This project is a draft — only you can see it. Publish it so classmates can play."
            : "This draft's build hasn't finished uploading yet."}
        </div>
      )}

      {project.index_path ? (
        <UnityPlayer
          src={publicShowcaseUrl(project.index_path)}
          title={project.title}
        />
      ) : (
        <Card>
          <p className="py-8 text-center text-sm text-wood-500">
            The build for this project isn&apos;t available yet.
          </p>
        </Card>
      )}

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-wood-900">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Avatar
              firstName={project.author.firstName}
              lastName={project.author.lastName}
              avatarUrl={project.author.avatarUrl}
              size="sm"
            />
            <span className="text-sm text-wood-600">
              {authorName(project.author)}
            </span>
            <span className="text-xs text-wood-400">
              · {formatShowcaseDate(project.created_at)}
            </span>
          </div>
        </div>
        <LikeButton
          projectId={project.id}
          initialLiked={project.likedByMe}
          initialCount={project.likeCount}
        />
      </div>

      {project.description && (
        <p className="mt-3 whitespace-pre-wrap text-wood-700">
          {project.description}
        </p>
      )}

      {canManage && (
        <div className="mt-5">
          <OwnerControls
            projectId={project.id}
            title={project.title}
            description={project.description ?? ""}
            published={project.published}
            canPublish={Boolean(project.index_path)}
          />
        </div>
      )}

      <hr className="my-7 border-wood-100" />

      <CommentSection
        projectId={project.id}
        comments={comments}
        currentUserId={user.id}
        isTeacher={isTeacher}
      />
    </div>
  );
}
