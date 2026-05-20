import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile, type UserProfile } from "@/lib/profile";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  RosterView,
  type RosterGroup,
  type RosterStudent,
} from "@/components/students/RosterView";

function toItem(s: UserProfile): RosterStudent {
  return {
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    username: s.username,
    avatarUrl: s.avatar_url,
  };
}

function byName(a: RosterStudent, b: RosterStudent): number {
  return (
    a.lastName.localeCompare(b.lastName) ||
    a.firstName.localeCompare(b.firstName)
  );
}

export default async function RosterPage() {
  await requireTeacher();
  const admin = createAdminClient();

  const [classesRes, enrollmentsRes, studentsRes] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, period_number")
      .order("period_number", { ascending: true, nullsFirst: false }),
    admin.from("enrollments").select("class_id, user_id"),
    admin.from("users").select("*").eq("role", "student"),
  ]);

  const students = (studentsRes.data ?? []).map(asProfile);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const enrollments = enrollmentsRes.data ?? [];

  const groups: RosterGroup[] = [];
  const enrolledIds = new Set<string>();

  for (const c of classesRes.data ?? []) {
    const members = enrollments
      .filter((e) => e.class_id === c.id)
      .map((e) => {
        enrolledIds.add(e.user_id);
        return studentById.get(e.user_id);
      })
      .filter((s): s is UserProfile => s !== undefined)
      .map(toItem)
      .sort(byName);

    if (members.length > 0) {
      groups.push({
        key: c.id,
        label:
          c.period_number != null
            ? `${c.name} · Period ${c.period_number}`
            : c.name,
        students: members,
      });
    }
  }

  const unassigned = students
    .filter((s) => !enrolledIds.has(s.id))
    .map(toItem)
    .sort(byName);
  if (unassigned.length > 0) {
    groups.push({
      key: "__unassigned__",
      label: "Not enrolled in a class",
      students: unassigned,
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description={`${students.length} ${
          students.length === 1 ? "student" : "students"
        } across all classes. Click anyone to open their full record.`}
      />
      <RosterView groups={groups} />
    </>
  );
}
