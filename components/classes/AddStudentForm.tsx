"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Input";
import { EXTENDED_TIME_VALUES, EXTENDED_TIME_LABELS } from "@/lib/assignments";
import { addStudentToClass } from "@/app/teacher/classes/actions";

interface AddStudentFormProps {
  classId: string;
}

type Created = { username: string; password: string };

export function AddStudentForm({ classId }: AddStudentFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await addStudentToClass(classId, formData);
      if (result.ok) {
        setCreated({ username: result.username, password: result.password });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          setCreated(null);
          setError(null);
        }}
      >
        <UserPlus className="w-4 h-4" strokeWidth={2} />
        Add a student
      </Button>
    );
  }

  return (
    <div className="rounded-cozy-lg border border-wood-200 bg-cream-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base text-wood-900 inline-flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-terracotta-700" strokeWidth={2} />
          Add a student
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-wood-400 hover:text-wood-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {created ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm text-sage-800">
            <Check className="w-4 h-4 flex-shrink-0" />
            Student added and enrolled.
          </p>
          <div className="rounded-cozy border border-sage-200 bg-sage-50 px-3 py-2.5 text-sm">
            <p className="text-wood-700">
              Username:{" "}
              <span className="font-mono font-semibold text-wood-900">
                {created.username}
              </span>
            </p>
            <p className="text-wood-700 mt-1">
              Password:{" "}
              <span className="font-mono font-semibold text-wood-900">
                {created.password}
              </span>
            </p>
            <p className="text-xs text-wood-500 mt-2">
              Write these down now — the password can&apos;t be shown again
              (you can reset it later from the roster).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setCreated(null);
                setError(null);
              }}
            >
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              Add another
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form action={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="as-first">First name</Label>
              <Input id="as-first" name="first_name" type="text" required />
            </div>
            <div>
              <Label htmlFor="as-last">Last name</Label>
              <Input id="as-last" name="last_name" type="text" required />
            </div>
          </div>

          <div>
            <Label htmlFor="as-email">
              Email{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Input id="as-email" name="real_email" type="email" />
            <FieldHint>Used for password-reset emails and notifications.</FieldHint>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="as-sid">
                Student ID #{" "}
                <span className="text-wood-500 font-normal">(optional)</span>
              </Label>
              <Input id="as-sid" name="student_id" type="text" />
            </div>
            <div>
              <Label htmlFor="as-ext">Extended time</Label>
              <Select id="as-ext" name="extended_time" defaultValue="none">
                {EXTENDED_TIME_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {EXTENDED_TIME_LABELS[v]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="as-username">
              Username{" "}
              <span className="text-wood-500 font-normal">
                (optional — auto-generated if blank)
              </span>
            </Label>
            <Input
              id="as-username"
              name="username"
              type="text"
              placeholder="e.g. jsmith"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <FieldHint>Lowercase letters and numbers only.</FieldHint>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-cozy border bg-terracotta-50 border-terracotta-200 text-terracotta-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              {pending ? "Adding…" : "Add student"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
