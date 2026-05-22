"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  setShowcasePublished,
  updateShowcaseProject,
  deleteShowcaseProject,
} from "@/app/showcase/actions";

/**
 * Owner / teacher panel on a project page: publish toggle, edit details,
 * and delete.
 */
export function OwnerControls({
  projectId,
  title,
  description,
  published,
  canPublish,
}: {
  projectId: string;
  title: string;
  description: string;
  published: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePublish() {
    setError(null);
    start(async () => {
      const result = await setShowcasePublished(projectId, !published);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Couldn't update.");
    });
  }

  function saveDetails() {
    setError(null);
    start(async () => {
      const result = await updateShowcaseProject(
        projectId,
        draftTitle,
        draftDescription
      );
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error ?? "Couldn't save.");
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      // On success this server action redirects to /showcase.
      await deleteShowcaseProject(projectId);
    });
  }

  return (
    <div className="rounded-cozy border border-wood-200 bg-cream-100/60 p-4">
      <p className="label-eyebrow mb-3">Manage project</p>

      {editing ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="oc-title">Title</Label>
            <Input
              id="oc-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={120}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="oc-desc">Description</Label>
            <Textarea
              id="oc-desc"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={pending}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveDetails} disabled={pending}>
              Save changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setDraftTitle(title);
                setDraftDescription(description);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={published ? "secondary" : "primary"}
            onClick={togglePublish}
            disabled={pending || (!published && !canPublish)}
          >
            {published ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Publish
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit details
          </Button>

          {confirmDelete ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs text-wood-600">Delete for good?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={remove}
                disabled={pending}
              >
                Yes, delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="text-terracotta-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}

      {!published && !canPublish && !editing && (
        <p className="mt-2 text-xs text-wood-500">
          Finish uploading the build before you can publish.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-terracotta-800">{error}</p>
      )}
    </div>
  );
}
