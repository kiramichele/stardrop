import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignmentReady } from "@/lib/assignments";
import { getAllExcusals } from "@/lib/excusals-server";
import { uniqueUsername, generatePassword } from "@/lib/csv";
import { usernameToEmail } from "@/lib/auth";
import {
  parseCanvasTemplate,
  mergeGradesIntoTemplate,
  normalizeTitle,
  type AppData,
  type AppGradeCell,
  type AppStudent,
  type MatchReport,
  type ParsedTemplate,
} from "@/lib/gradebook";

// Server-only: stores the uploaded Canvas template and merges app grades
// into it for export. Admin-client based — every caller is a
// requireTeacher()-gated route or action. Never import from a client file.

// A throwaway uuid used only as a "match everything" filter for delete()
// (PostgREST refuses an unfiltered delete).
const NO_MATCH_UUID = "00000000-0000-0000-0000-000000000000";

// =============================================================
// Stored template (the teacher's Canvas gradebook export)
// =============================================================

export type StoredTemplate = {
  filename: string;
  csvText: string;
  uploadedAt: string;
};

export async function getStoredTemplate(): Promise<StoredTemplate | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gradebook_template")
    .select("filename, csv_text, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    filename: data.filename,
    csvText: data.csv_text,
    uploadedAt: data.uploaded_at,
  };
}

/** Replace the stored template — only the newest upload is kept. */
export async function saveTemplate(
  filename: string,
  csvText: string,
  uploadedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  await admin.from("gradebook_template").delete().neq("id", NO_MATCH_UUID);
  const { error } = await admin
    .from("gradebook_template")
    .insert({ filename, csv_text: csvText, uploaded_by: uploadedBy });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearStoredTemplate(): Promise<void> {
  const admin = createAdminClient();
  await admin.from("gradebook_template").delete().neq("id", NO_MATCH_UUID);
}

// =============================================================
// App-side grade data
// =============================================================

/** Gather every student, their grades, and the assignment catalog. */
export async function buildAppData(): Promise<AppData> {
  const admin = createAdminClient();
  const [
    classesRes,
    enrollmentsRes,
    studentsRes,
    assignmentsRes,
    submissionsRes,
    excusals,
  ] = await Promise.all([
    admin.from("classes").select("id, name"),
    admin.from("enrollments").select("user_id, class_id"),
    admin
      .from("users")
      .select("id, first_name, last_name, real_email, student_id")
      .eq("role", "student"),
    admin
      .from("assignments")
      .select("id, class_id, title, points, type, interactive_html_url")
      .eq("published", true),
    admin
      .from("submissions")
      .select("user_id, assignment_id, status, grades(score)"),
    getAllExcusals(),
  ]);

  const className = new Map<string, string>();
  for (const c of classesRes.data ?? []) className.set(c.id, c.name);

  const studentsByClass = new Map<string, string[]>();
  for (const e of enrollmentsRes.data ?? []) {
    const arr = studentsByClass.get(e.class_id) ?? [];
    arr.push(e.user_id);
    studentsByClass.set(e.class_id, arr);
  }

  const readyAssignments = (assignmentsRes.data ?? []).filter(
    isAssignmentReady
  );

  const subKey = (u: string, a: string) => `${u}::${a}`;
  const scoreByUserAssignment = new Map<string, number | null>();
  for (const s of submissionsRes.data ?? []) {
    const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
    scoreByUserAssignment.set(
      subKey(s.user_id, s.assignment_id),
      grade?.score ?? null
    );
  }

  // One grade cell per (student, applicable assignment) that has a score
  // or an excusal — anything else has nothing to write to the export.
  const gradesByStudent = new Map<string, AppGradeCell[]>();
  for (const a of readyAssignments) {
    const section = className.get(a.class_id) ?? "";
    const titleNorm = normalizeTitle(a.title);
    for (const studentId of studentsByClass.get(a.class_id) ?? []) {
      const excused = excusals.has(`${studentId}::${a.id}`);
      const score = scoreByUserAssignment.get(subKey(studentId, a.id)) ?? null;
      if (score === null && !excused) continue;
      const arr = gradesByStudent.get(studentId) ?? [];
      arr.push({ titleNorm, section, score, excused });
      gradesByStudent.set(studentId, arr);
    }
  }

  // Distinct assignment titles (first occurrence keeps the points/casing).
  const titleMap = new Map<string, { title: string; points: number }>();
  for (const a of readyAssignments) {
    const n = normalizeTitle(a.title);
    if (!n || titleMap.has(n)) continue;
    titleMap.set(n, { title: a.title, points: a.points });
  }

  const students: AppStudent[] = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    email: s.real_email,
    studentId: s.student_id,
  }));

  return {
    students,
    gradesByStudent,
    appAssignmentTitles: [...titleMap.values()],
  };
}

// =============================================================
// Building the export
// =============================================================

function exportFilename(): string {
  return `gradebook-canvas-${new Date().toISOString().slice(0, 10)}.csv`;
}

export type BuildResult =
  | { ok: true; csv: string; filename: string; report: MatchReport }
  | { ok: false; error: string };

/** Parse the stored template and merge app grades into it. */
export async function buildMergedGradebook(): Promise<BuildResult> {
  const stored = await getStoredTemplate();
  if (!stored) {
    return {
      ok: false,
      error:
        "No Canvas template uploaded yet. Upload your Canvas gradebook export first.",
    };
  }
  const parsed = parseCanvasTemplate(stored.csvText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const app = await buildAppData();
  const { csv, report } = mergeGradesIntoTemplate(parsed.template, app);
  return { ok: true, csv, filename: exportFilename(), report };
}

export type GradebookStatus = {
  hasTemplate: boolean;
  filename: string | null;
  uploadedAt: string | null;
  /** null when there's no template, or the stored file no longer parses. */
  report: MatchReport | null;
  parseError: string | null;
};

/** Template metadata + a fresh match report, for the Roster page panel. */
export async function getGradebookStatus(): Promise<GradebookStatus> {
  const stored = await getStoredTemplate();
  if (!stored) {
    return {
      hasTemplate: false,
      filename: null,
      uploadedAt: null,
      report: null,
      parseError: null,
    };
  }
  const parsed = parseCanvasTemplate(stored.csvText);
  if (!parsed.ok) {
    return {
      hasTemplate: true,
      filename: stored.filename,
      uploadedAt: stored.uploadedAt,
      report: null,
      parseError: parsed.error,
    };
  }
  const app = await buildAppData();
  const { report } = mergeGradesIntoTemplate(parsed.template, app);
  return {
    hasTemplate: true,
    filename: stored.filename,
    uploadedAt: stored.uploadedAt,
    report,
    parseError: null,
  };
}

// =============================================================
// Roster sync — create classes & students from the template
//
// The Canvas gradebook export doubles as the roster source: every
// student row that isn't already in the app gets an account, and its
// section becomes a class. Re-uploading is safe — existing students are
// matched (by SIS id, email, then name) and skipped, so only genuinely
// new students are created.
// =============================================================

// Term for a brand-new class when the app has none to copy from. Once
// any class exists, its term is reused so re-uploads never duplicate.
const FALLBACK_TERM = "2026-27 Fall";

export type RosterSyncResult = {
  /** Newly created student accounts, with login credentials to hand out. */
  created: Array<{
    name: string;
    username: string;
    password: string;
    section: string;
  }>;
  /** Existing students newly enrolled into a class. */
  enrolled: number;
  /** Students that were already set up and enrolled. */
  alreadyPresent: number;
  /** Names of classes created from Section values. */
  classesCreated: string[];
  errors: string[];
};

/** Split a Canvas "Last, First" name. Falls back gracefully if there's no comma. */
function splitCanvasName(raw: string): { firstName: string; lastName: string } {
  const name = raw.trim();
  const comma = name.indexOf(",");
  if (comma !== -1) {
    return {
      lastName: name.slice(0, comma).trim(),
      firstName: name.slice(comma + 1).trim(),
    };
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: name, lastName: name };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Create any classes and students from the parsed template that the app
 * doesn't already have. Idempotent — safe to run on every upload.
 */
export async function syncStudentsFromTemplate(
  template: ParsedTemplate
): Promise<RosterSyncResult> {
  const admin = createAdminClient();
  const result: RosterSyncResult = {
    created: [],
    enrolled: 0,
    alreadyPresent: 0,
    classesCreated: [],
    errors: [],
  };

  // Reuse an existing class's term for any new class, so a section that
  // already exists is matched by name and never duplicated.
  const { data: existingClasses } = await admin
    .from("classes")
    .select("id, name, term");
  const term = existingClasses?.[0]?.term ?? FALLBACK_TERM;

  const classByName = new Map<string, string>();
  for (const c of existingClasses ?? []) {
    classByName.set(c.name.trim().toLowerCase(), c.id);
  }

  async function resolveClass(section: string): Promise<string | null> {
    const key = section.trim().toLowerCase();
    if (!key) return null;
    const existing = classByName.get(key);
    if (existing) return existing;
    const { data: created, error } = await admin
      .from("classes")
      .insert({ name: section.trim(), term })
      .select("id")
      .single();
    if (error || !created) {
      result.errors.push(
        `Couldn't create class "${section}": ${error?.message ?? "unknown error"}`
      );
      return null;
    }
    classByName.set(key, created.id);
    result.classesCreated.push(section.trim());
    return created.id;
  }

  const takenInBatch = new Set<string>();

  for (const row of template.students) {
    const nameLc = row.studentName.trim().toLowerCase();
    // Canvas seeds every course with a fake "Test Student" — skip it.
    if (nameLc === "student, test" || nameLc === "test student") continue;

    const { firstName, lastName } = splitCanvasName(row.studentName);
    if (!firstName && !lastName) {
      result.errors.push("Skipped a row with no student name.");
      continue;
    }

    const email = row.sisLoginId.includes("@") ? row.sisLoginId.trim() : null;
    const studentId = row.sisUserId.trim() || null;
    const classId = await resolveClass(row.section);

    // Find an existing student: SIS id, then email, then name.
    let existing: { id: string; student_id: string | null } | null = null;
    if (studentId) {
      const { data } = await admin
        .from("users")
        .select("id, student_id")
        .eq("student_id", studentId)
        .eq("role", "student")
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing && email) {
      const { data } = await admin
        .from("users")
        .select("id, student_id")
        .eq("real_email", email)
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing) {
      const { data } = await admin
        .from("users")
        .select("id, student_id")
        .ilike("first_name", firstName)
        .ilike("last_name", lastName)
        .eq("role", "student")
        .maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      if (studentId && !existing.student_id) {
        await admin
          .from("users")
          .update({ student_id: studentId })
          .eq("id", existing.id);
      }
      if (classId) {
        const { data: enroll } = await admin
          .from("enrollments")
          .select("id")
          .eq("user_id", existing.id)
          .eq("class_id", classId)
          .maybeSingle();
        if (enroll) {
          result.alreadyPresent++;
        } else {
          await admin
            .from("enrollments")
            .insert({ user_id: existing.id, class_id: classId });
          result.enrolled++;
        }
      } else {
        result.alreadyPresent++;
      }
      continue;
    }

    // Create a new student account.
    const username = await uniqueUsername(
      admin,
      firstName || lastName,
      lastName || firstName,
      takenInBatch
    );
    const password = generatePassword();

    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: usernameToEmail(username),
        password,
        email_confirm: true,
        user_metadata: { username },
      });
    if (authError || !authUser.user) {
      result.errors.push(
        `${firstName} ${lastName}: account creation failed (${authError?.message ?? "unknown error"})`
      );
      continue;
    }

    const { error: profileError } = await admin.from("users").insert({
      id: authUser.user.id,
      username,
      real_email: email,
      first_name: firstName,
      last_name: lastName,
      role: "student",
      student_id: studentId,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      result.errors.push(
        `${firstName} ${lastName}: profile creation failed (${profileError.message})`
      );
      continue;
    }

    if (classId) {
      await admin
        .from("enrollments")
        .insert({ user_id: authUser.user.id, class_id: classId });
    }

    result.created.push({
      name: `${firstName} ${lastName}`.trim(),
      username,
      password,
      section: row.section.trim(),
    });
  }

  return result;
}
