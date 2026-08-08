"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  EXTENDED_TIME_VALUES,
  EXTENDED_TIME_LABELS,
  type ExtendedTime,
} from "@/lib/assignments";
import { updateStudentDetails } from "@/app/teacher/students/actions";

interface EditStudentFormProps {
  studentId: string;
  initial: {
    firstName: string;
    lastName: string;
    email: string | null;
    parentEmail: string | null;
    parentEmail2: string | null;
    studentIdNumber: string | null;
    extendedTime: ExtendedTime;
  };
}

/**
 * Edit a student's profile inline on their overview page. Changing the first
 * name here is how a teacher sets a preferred / "goes by" name — the whole app
 * reads first_name/last_name for display.
 */
export function EditStudentForm({ studentId, initial }: EditStudentFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const r = await updateStudentDetails(studentId, formData);
      if (r.ok) {
        setMsg({ text: "Saved.", error: false });
        router.refresh();
      } else {
        setMsg({ text: r.error ?? "Save failed", error: true });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <p className="label-eyebrow">Edit student</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="es-first" className="text-xs">
            First name{" "}
            <span className="text-wood-500 font-normal">(or preferred name)</span>
          </Label>
          <Input
            id="es-first"
            name="first_name"
            type="text"
            defaultValue={initial.firstName}
            required
          />
        </div>
        <div>
          <Label htmlFor="es-last" className="text-xs">
            Last name
          </Label>
          <Input
            id="es-last"
            name="last_name"
            type="text"
            defaultValue={initial.lastName}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="es-email" className="text-xs">
            Email{" "}
            <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="es-email"
            name="real_email"
            type="email"
            defaultValue={initial.email ?? ""}
            placeholder="Not set"
          />
        </div>
        <div>
          <Label htmlFor="es-parent-email" className="text-xs">
            Parent/guardian email{" "}
            <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="es-parent-email"
            name="parent_email"
            type="email"
            defaultValue={initial.parentEmail ?? ""}
            placeholder="Not set"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="es-parent-email-2" className="text-xs">
          Second parent/guardian email{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Input
          id="es-parent-email-2"
          name="parent_email_2"
          type="email"
          defaultValue={initial.parentEmail2 ?? ""}
          placeholder="Not set"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="es-sid" className="text-xs">
            Student ID
          </Label>
          <Input
            id="es-sid"
            name="student_id"
            type="text"
            defaultValue={initial.studentIdNumber ?? ""}
            placeholder="Not set"
          />
        </div>
        <div>
          <Label htmlFor="es-ext" className="text-xs">
            Extended time
          </Label>
          <Select
            id="es-ext"
            name="extended_time"
            defaultValue={initial.extendedTime}
          >
            {EXTENDED_TIME_VALUES.map((v) => (
              <option key={v} value={v}>
                {EXTENDED_TIME_LABELS[v]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {msg && (
          <span
            className={[
              "inline-flex items-center gap-1.5 text-xs",
              msg.error ? "text-terracotta-700" : "text-sage-700",
            ].join(" ")}
          >
            {msg.error ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {msg.text}
          </span>
        )}
      </div>

      <p className="text-xs text-wood-400">
        Student ID matches the Canvas gradebook export. Extended time sets which
        due date this student gets on every assignment. Parent/guardian emails
        are who parent digests go to from the Parent digest page — both get a
        copy if you set two.
      </p>
    </form>
  );
}
