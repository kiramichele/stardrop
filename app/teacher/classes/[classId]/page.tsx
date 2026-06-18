import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asProfile, type UserProfile } from "@/lib/profile";
import { getClassColorMap } from "@/lib/class-colors-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClassColorDot } from "@/components/ui/ClassColorDot";
import { ClassColorPicker } from "@/components/classes/ClassColorPicker";
import { updateClass, deleteClass } from "../actions";
import { StudentRow } from "./StudentRow";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const supabase = await createClient();

  const [{ data: klass }, colorMap] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, period_number, term")
      .eq("id", classId)
      .single(),
    getClassColorMap(),
  ]);
  if (!klass) notFound();
  const classColor = colorMap.get(classId) ?? null;

  // Roster: get enrolled users with their profile info
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id, users(*)")
    .eq("class_id", classId);

  const students = (enrollments ?? [])
    .map((e) => {
      const u = Array.isArray(e.users) ? e.users[0] : e.users;
      return u ? asProfile(u) : null;
    })
    .filter((u): u is UserProfile => !!u && !!u.id)
    .sort((a, b) => {
      const ln = a.last_name.localeCompare(b.last_name);
      return ln !== 0 ? ln : a.first_name.localeCompare(b.first_name);
    });

  // All other classes — for the "move to" dropdown
  const { data: allOtherClasses } = await supabase
    .from("classes")
    .select("id, name")
    .neq("id", classId)
    .order("period_number", { ascending: true, nullsFirst: false });

  const otherClasses = allOtherClasses ?? [];

  const updateAction = updateClass.bind(null, classId);

  async function handleDelete() {
    "use server";
    await deleteClass(classId);
  }

  return (
    <>
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to classes
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ClassColorDot color={classColor} />
            {klass.period_number ? `Period ${klass.period_number}` : "Class"}
          </span>
        }
        title={klass.name}
        description={`${klass.term} · ${students.length} ${students.length === 1 ? "student" : "students"}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl text-wood-800">Roster</h2>

          {students.length === 0 ? (
            <Card>
              <EmptyState
                icon={Users}
                title="No students in this class"
                description="Import a CSV to add students, or move students from another class using the 'Move to…' dropdown there."
                action={
                  <Link href="/teacher/classes/import">
                    <Button>Import CSV</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {students.map((s) => (
                  <li key={s.id} className="p-1.5">
                    <StudentRow
                      enrollmentUser={s}
                      classId={classId}
                      className={klass.name}
                      otherClasses={otherClasses}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Settings column */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Class settings
            </h3>
            <form action={updateAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={klass.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="period_number">Period</Label>
                <Select
                  id="period_number"
                  name="period_number"
                  defaultValue={klass.period_number?.toString() ?? ""}
                >
                  <option value="">— Not set —</option>
                  <option value="1">Period 1</option>
                  <option value="2">Period 2</option>
                  <option value="4">Period 4</option>
                  <option value="5">Period 5</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  name="term"
                  type="text"
                  defaultValue={klass.term}
                  required
                />
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save changes
              </Button>
            </form>
          </Card>

          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-1">
              Color tag
            </h3>
            <p className="text-xs text-wood-500 mb-3">
              A quick visual cue for telling this period apart across Stardrop.
            </p>
            <ClassColorPicker classId={classId} current={classColor} />
          </Card>

          <Card className="border-terracotta-200 bg-terracotta-50/50">
            <h3 className="font-display text-base text-terracotta-900 mb-1">
              Danger zone
            </h3>
            <p className="text-xs text-terracotta-800 mb-3">
              {students.length > 0
                ? `Deleting unenrolls ${students.length} ${students.length === 1 ? "student" : "students"}. Their accounts stay.`
                : "Permanently deletes this class."}
            </p>
            <form action={handleDelete}>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                className="w-full"
              >
                Delete class
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}