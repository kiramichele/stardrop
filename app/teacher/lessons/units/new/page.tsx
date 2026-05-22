import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/Input";
import { createUnit } from "../../actions";

export default function NewUnitPage() {
  return (
    <>
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader
        eyebrow="New unit"
        title="Create a unit"
        description="A unit is a group of lessons taught in sequence. You'll add lessons to it next."
      />

      <Card className="max-w-2xl">
        <form action={createUnit} className="space-y-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Unit 1 — Foundations of Game Design"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What students will learn in this unit"
            />
            <FieldHint>Shown to students on their lessons page.</FieldHint>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/teacher/lessons">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">Create unit</Button>
          </div>
        </form>
      </Card>
    </>
  );
}