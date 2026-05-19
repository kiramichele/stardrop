"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { addFeedbackMessage } from "@/app/teacher/assignments/actions";
import type { FeedbackEntry } from "@/lib/feedback";

interface FeedbackThreadProps {
  submissionId: string;
  entries: FeedbackEntry[];
  currentUserRole: "teacher" | "student";
  canReply: boolean;
}

export function FeedbackThread({
  submissionId,
  entries,
  currentUserRole,
  canReply,
}: FeedbackThreadProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();

  function handleSubmit(formData: FormData) {
    const raw = formData.get("body")?.toString() ?? "";
    const trimmed = raw.trim();
    if (!trimmed) return;
    setError(null);
    startSend(async () => {
      const fd = new FormData();
      fd.set("body", trimmed);
      const result = await addFeedbackMessage(submissionId, fd);
      if (result.ok) {
        setBody("");
      } else {
        setError(result.error ?? "Failed to send");
      }
    });
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="text-sm text-wood-500 italic">No feedback yet.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => {
            const isTeacher = entry.authorRole === "teacher";
            return (
              <li key={entry.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <Avatar
                    firstName={entry.authorFirstName}
                    lastName={entry.authorLastName}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-wood-900">
                      {entry.authorFirstName} {entry.authorLastName}
                    </p>
                    <span
                      className={[
                        "text-[0.65rem] uppercase tracking-wide-label font-semibold px-1.5 py-0.5 rounded-cozy",
                        isTeacher
                          ? "bg-terracotta-100 text-terracotta-800"
                          : "bg-sage-100 text-sage-800",
                      ].join(" ")}
                    >
                      {isTeacher ? "Teacher" : "Student"}
                    </span>
                    <p className="text-xs text-wood-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-wood-800 whitespace-pre-wrap leading-relaxed">
                    {entry.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canReply && (
        <form
          action={handleSubmit}
          className="pt-3 border-t border-wood-100 space-y-2"
        >
          <Textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              currentUserRole === "student"
                ? "Reply to your teacher…"
                : "Reply to your student…"
            }
            rows={3}
            disabled={isSending}
          />
          {error && (
            <p className="text-xs text-terracotta-700 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-2 py-1">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSending || !body.trim()}
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
              {isSending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
