import { createAdminClient } from "@/lib/supabase/admin";
import { getClassOptions } from "@/lib/classes-server";

// Dashboard announcements — a teacher writes a short note, optionally
// scoped to specific classes, and it shows on the matching students'
// dashboards until deleted. No scheduling, no per-student dismissal.

export type Announcement = {
  id: string;
  body: string;
  createdAt: string;
  createdByName: string | null;
  classLabels: string[] | null;
};

/** Every announcement, newest first — for the teacher's manage list. */
export async function getAnnouncementsForTeacher(): Promise<Announcement[]> {
  const admin = createAdminClient();
  const [{ data: rows }, classes] = await Promise.all([
    admin
      .from("announcements")
      .select("id, body, class_ids, created_at, users(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    getClassOptions(),
  ]);
  const classLabelById = new Map(classes.map((c) => [c.id, c.label]));

  return (rows ?? []).map((r) => {
    const author = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      createdByName: author
        ? `${author.first_name} ${author.last_name}`.trim() || null
        : null,
      classLabels: r.class_ids?.length
        ? r.class_ids.map((id) => classLabelById.get(id) ?? "Unknown class")
        : null,
    };
  });
}

/**
 * Announcements aimed at this student: no class scope (everyone) or
 * overlapping one of their enrolled classes. Newest first, capped so the
 * dashboard doesn't turn into a wall of old notes.
 */
export async function getActiveAnnouncementsForStudent(
  studentId: string
): Promise<Announcement[]> {
  const admin = createAdminClient();

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("class_id")
    .eq("user_id", studentId);
  const classIds = (enrollments ?? []).map((e) => e.class_id);

  const filter =
    classIds.length > 0
      ? `class_ids.is.null,class_ids.ov.{${classIds.join(",")}}`
      : "class_ids.is.null";

  const { data: rows } = await admin
    .from("announcements")
    .select("id, body, class_ids, created_at, users(first_name, last_name)")
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(5);

  return (rows ?? []).map((r) => {
    const author = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      createdByName: author
        ? `${author.first_name} ${author.last_name}`.trim() || null
        : null,
      classLabels: null, // not shown to students — irrelevant to them
    };
  });
}

export async function createAnnouncement(args: {
  body: string;
  classIds: string[];
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = args.body.trim();
  if (!body) return { ok: false, error: "Write something first." };

  const admin = createAdminClient();
  const { error } = await admin.from("announcements").insert({
    body,
    class_ids: args.classIds.length > 0 ? args.classIds : null,
    created_by: args.createdBy,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAnnouncement(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
