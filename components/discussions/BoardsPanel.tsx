"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pin, Lock, Trash2, MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import {
  createBoard,
  deleteBoard,
  setBoardPinned,
  setBoardLocked,
} from "@/app/discussions/actions";
import type { DiscussionBoard } from "@/lib/discussions";

interface BoardsPanelProps {
  boards: DiscussionBoard[];
  classes: Array<{ id: string; name: string }>;
  isTeacher: boolean;
}

export function BoardsPanel({ boards, classes, isTeacher }: BoardsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function submitBoard() {
    if (!title.trim()) {
      setError("Title required");
      return;
    }
    if (!classId) {
      setError("Pick a class");
      return;
    }
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    fd.set("class_id", classId);
    start(async () => {
      const r = await createBoard(fd);
      if (r.ok) {
        setTitle("");
        setDescription("");
        setShowForm(false);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {classes.length > 0 && !showForm && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" strokeWidth={2} />
            New board
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <h3 className="font-display text-lg text-wood-900 mb-3">
            New discussion board
          </h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="b-title">Title</Label>
              <Input
                id="b-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Share your game ideas"
              />
            </div>
            <div>
              <Label htmlFor="b-desc">Description (optional)</Label>
              <Textarea
                id="b-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="b-class">Class</Label>
              <Select
                id="b-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            {error && <p className="text-xs text-terracotta-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submitBoard} disabled={isPending}>
                Create board
              </Button>
            </div>
          </div>
        </Card>
      )}

      {boards.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-6">
            No discussion boards yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {boards.map((b) => (
            <Card key={b.id} hoverable className="group">
              <div className="flex items-start gap-3">
                <Link
                  href={`/discussions/${b.id}`}
                  className="flex items-start gap-3 flex-1 min-w-0"
                >
                  <div className="w-10 h-10 rounded-cozy bg-terracotta-50 text-terracotta-600 flex items-center justify-center flex-shrink-0">
                    <MessagesSquare className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {b.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-terracotta-600 flex-shrink-0" />
                      )}
                      <h3 className="font-display text-lg text-wood-900 truncate">
                        {b.title}
                      </h3>
                      {b.isLocked && (
                        <Lock className="w-3.5 h-3.5 text-wood-400 flex-shrink-0" />
                      )}
                    </div>
                    {b.description && (
                      <p className="text-sm text-wood-600 line-clamp-1">
                        {b.description}
                      </p>
                    )}
                    <p className="text-xs text-wood-500 mt-0.5">
                      {b.className ?? "Class"} · {b.threadCount}{" "}
                      {b.threadCount === 1 ? "thread" : "threads"}
                    </p>
                  </div>
                </Link>
                {isTeacher && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          await setBoardPinned(b.id, !b.isPinned);
                        })
                      }
                      disabled={isPending}
                      title={b.isPinned ? "Unpin board" : "Pin board"}
                      className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
                    >
                      <Pin className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          await setBoardLocked(b.id, !b.isLocked);
                        })
                      }
                      disabled={isPending}
                      title={b.isLocked ? "Unlock board" : "Lock board"}
                      className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete "${b.title}" and all its threads? This can't be undone.`
                          )
                        ) {
                          start(async () => {
                            await deleteBoard(b.id);
                          });
                        }
                      }}
                      disabled={isPending}
                      title="Delete board"
                      className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
