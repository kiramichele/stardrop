import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNMENT_TYPE_LABELS,
  SUPPORTED_TYPES,
  type AssignmentType,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Textarea,
  Select,
  FieldHint,
} from "@/components/ui/Input";
import { createAssignment } from "../actions";

export default async function NewAssignmentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });

  // If there are no classes, the assignment form has no target — redirect to classes
  if (!classes || classes.length === 0) redirect("/teacher/classes");

  const allTypes = Object.keys(ASSIGNMENT_TYPE_LABELS) as AssignmentType[];

  return (
    <>
      <Link
        href="/teacher/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to assignments
      </Link>

      <PageHeader
        eyebrow="New assignment"
        title="Create an assignment"
        description="Set the basics. You can publish it once you're happy with it on the detail page."
      />

      <Card className="max-w-2xl">
        <form action={createAssignment} className="space-y-5">
          <div>
            <Label htmlFor="class_id">Class</Label>
            <Select id="class_id" name="class_id" required defaultValue="">
              <option value="" disabled>
                Pick a class…
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.period_number ? ` (Period ${c.period_number})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" required defaultValue="code">
              {allTypes.map((t) => {
                const supported = SUPPORTED_TYPES.includes(t);
                return (
                  <option key={t} value={t} disabled={!supported}>
                    {ASSIGNMENT_TYPE_LABELS[t]}
                    {!supported ? " — coming soon" : ""}
                  </option>
                );
              })}
            </Select>
            <FieldHint>
              Only Code is available for now. Other types arrive in upcoming
              sessions.
            </FieldHint>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Lab 1 — Player movement script"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              name="instructions"
              rows={5}
              placeholder="What students should do, deliverables, hints, anything else they need to know."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" name="due_date" type="datetime-local" />
              <FieldHint>Optional. Late submissions are accepted but tagged.</FieldHint>
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                name="points"
                type="number"
                min="0"
                step="0.5"
                defaultValue={100}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-wood-100">
            <Link href="/teacher/assignments">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">Create assignment</Button>
          </div>
        </form>
      </Card>
    </>
  );
}