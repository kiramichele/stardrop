import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNMENT_TYPE_LABELS,
  SUPPORTED_TYPES,
  type AssignmentType,
} from "@/lib/assignments";
import { getRubricsForTeacher } from "@/lib/rubrics-server";
import { rubricMaxPoints } from "@/lib/rubrics";
import { getUnitsForTeacher } from "@/lib/lessons";
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
import { UnitLessonPicker } from "@/components/assignments/UnitLessonPicker";
import { createAssignment } from "../actions";

export default async function NewAssignmentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });

  if (!classes || classes.length === 0) redirect("/teacher/classes");

  const allTypes = Object.keys(ASSIGNMENT_TYPE_LABELS) as AssignmentType[];
  const rubrics = await getRubricsForTeacher();
  const units = (await getUnitsForTeacher()).map((u) => ({
    id: u.id,
    title: u.title,
    lessons: u.lessons.map((l) => ({ id: l.id, title: l.title })),
  }));

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
              Code, Interactive HTML, Short answer, Discussion, Unity upload,
              Dev log, and Video response are all available. Check-in is being
              retired in favor of Dev log.
            </FieldHint>
          </div>

          <UnitLessonPicker units={units} />

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Reflection — What is a game?"
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

          <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
            <p className="text-sm font-medium text-wood-800 mb-2">
              Extended-time due dates{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date_1_5x" className="text-xs">
                  1.5× time
                </Label>
                <Input
                  id="due_date_1_5x"
                  name="due_date_1_5x"
                  type="datetime-local"
                />
              </div>
              <div>
                <Label htmlFor="due_date_2x" className="text-xs">
                  2× (double) time
                </Label>
                <Input
                  id="due_date_2x"
                  name="due_date_2x"
                  type="datetime-local"
                />
              </div>
            </div>
            <FieldHint>
              Students in an extended-time group are held to their
              group&apos;s date. Leave blank to fall back to the regular due
              date.
            </FieldHint>
          </div>

          <div>
            <Label htmlFor="minimum_word_count">
              Minimum word count{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="minimum_word_count"
              name="minimum_word_count"
              type="number"
              min="1"
              placeholder="e.g. 100"
            />
            <FieldHint>
              Only applies to Short answer and Discussion. Submit is disabled
              until the student hits the threshold. Leave blank for no minimum.
            </FieldHint>
          </div>

          <div>
            <Label htmlFor="rubric_id">
              Rubric{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Select id="rubric_id" name="rubric_id" defaultValue="">
              <option value="">No rubric (single score)</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {rubricMaxPoints(r.criteria)} pts
                </option>
              ))}
            </Select>
            <FieldHint>
              When a rubric is attached, grading shows a score input per
              criterion and auto-sums the total.{" "}
              <Link
                href="/teacher/rubrics"
                className="text-terracotta-700 hover:text-terracotta-800 underline"
                target="_blank"
              >
                Manage rubrics
              </Link>
            </FieldHint>
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