import Papa from "papaparse";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";

// =============================================================
// CSV row schema
//
// Required: first_name, last_name, real_email
// Optional: student_id, section
//
// If `section` is present, we create/use that class.
// If `section` is missing, we require a class_id from the form
// (single-class upload mode).
// =============================================================
export const rosterRowSchema = z.object({
  first_name: z.string().trim().min(1, "first_name required"),
  last_name: z.string().trim().min(1, "last_name required"),
  real_email: z.string().trim().email("invalid email"),
  student_id: z.string().trim().optional(),
  section: z.string().trim().optional(),
});

export type RosterRow = z.infer<typeof rosterRowSchema>;

export type ImportResult = {
  created: Array<{
    username: string;
    first_name: string;
    last_name: string;
    password: string;
    section?: string;
  }>;
  skipped: Array<{ row: number; reason: string; data: Partial<RosterRow> }>;
  errors: Array<{ row: number; message: string }>;
  classes_created: string[];
};

// =============================================================
// Parse CSV text into typed rows
// =============================================================
export function parseRosterCsv(csvText: string): {
  rows: RosterRow[];
  errors: Array<{ row: number; message: string }>;
} {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: RosterRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  parsed.data.forEach((raw, i) => {
    const result = rosterRowSchema.safeParse(raw);
    if (!result.success) {
      errors.push({
        row: i + 2, // +1 for header, +1 for 1-indexing
        message: result.error.issues.map((iss) => iss.message).join(", "),
      });
      return;
    }
    rows.push(result.data);
  });

  return { rows, errors };
}

// =============================================================
// Username generation
//
// "Jane Smith" -> "jsmith"
// Collisions -> "jsmith2", "jsmith3", ...
// Strips non-alphanumeric chars (apostrophes, hyphens, etc.)
// =============================================================
export function baseUsername(first: string, last: string): string {
  const cleanFirst = first.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanLast = last.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanFirst.charAt(0)}${cleanLast}`;
}

export async function uniqueUsername(
  supabase: ReturnType<typeof createAdminClient>,
  first: string,
  last: string,
  takenInBatch: Set<string>
): Promise<string> {
  const base = baseUsername(first, last);
  let candidate = base;
  let n = 1;

  while (true) {
    // Check in-batch first (avoid DB hit for duplicates within same upload)
    if (takenInBatch.has(candidate)) {
      n += 1;
      candidate = `${base}${n}`;
      continue;
    }

    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (!data) {
      takenInBatch.add(candidate);
      return candidate;
    }

    n += 1;
    candidate = `${base}${n}`;
  }
}

// =============================================================
// Random password generator (memorable-ish)
// e.g. "happy-otter-47"
// =============================================================
const adjectives = [
  "happy", "sunny", "cozy", "brave", "swift", "quiet", "warm", "kind",
  "bright", "calm", "merry", "lucky", "gentle", "clever", "bold",
];
const animals = [
  "otter", "fox", "owl", "deer", "bear", "wolf", "frog", "rabbit",
  "moth", "crow", "hawk", "swan", "cat", "moose", "lynx",
];

export function generatePassword(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${animal}-${num}`;
}

// =============================================================
// Main import function
//
// Handles two modes:
// 1. Multi-section: rows have `section` column, we create/use those classes
// 2. Single-class: caller passes class_id, all rows go there
// =============================================================
export async function importRoster(
  rows: RosterRow[],
  options: { term: string; class_id?: string }
): Promise<ImportResult> {
  const supabase = createAdminClient();
  const result: ImportResult = {
    created: [],
    skipped: [],
    errors: [],
    classes_created: [],
  };

  // Step 1: resolve target class(es)
  // section_name -> class_id
  const classCache = new Map<string, string>();

  if (options.class_id) {
    // Single-class mode: every row goes to the same class
    classCache.set("__single__", options.class_id);
  } else {
    // Multi-section mode: find or create each unique section
    const sections = new Set(
      rows.map((r) => r.section).filter((s): s is string => !!s)
    );

    if (sections.size === 0) {
      result.errors.push({
        row: 0,
        message:
          "No `section` column found and no class selected. Either add a `section` column to your CSV or pick a class to import into.",
      });
      return result;
    }

    for (const section of sections) {
      const { data: existing } = await supabase
        .from("classes")
        .select("id")
        .eq("name", section)
        .eq("term", options.term)
        .maybeSingle();

      if (existing) {
        classCache.set(section, existing.id);
      } else {
        const { data: newClass, error } = await supabase
          .from("classes")
          .insert({ name: section, term: options.term })
          .select("id")
          .single();

        if (error || !newClass) {
          result.errors.push({
            row: 0,
            message: `Failed to create class "${section}": ${error?.message ?? "unknown error"}`,
          });
          continue;
        }

        classCache.set(section, newClass.id);
        result.classes_created.push(section);
      }
    }
  }

  // Step 2: process each row
  const takenInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // for error reporting

    // Resolve target class
    const targetClassId = options.class_id
      ? classCache.get("__single__")
      : row.section
        ? classCache.get(row.section)
        : undefined;

    if (!targetClassId) {
      result.skipped.push({
        row: rowNum,
        reason: "no target class (missing section)",
        data: row,
      });
      continue;
    }

    // Check if user already exists by real_email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, username")
      .eq("real_email", row.real_email)
      .maybeSingle();

    if (existingUser) {
      // Already exists — ensure enrollment in this class
      const { data: existingEnroll } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("class_id", targetClassId)
        .maybeSingle();

      if (!existingEnroll) {
        await supabase
          .from("enrollments")
          .insert({ user_id: existingUser.id, class_id: targetClassId });
      }

      // Backfill the student_id if the CSV supplies one. Re-uploading the
      // roster is how a teacher fills these in for already-created students.
      if (row.student_id) {
        await supabase
          .from("users")
          .update({ student_id: row.student_id })
          .eq("id", existingUser.id);
      }

      result.skipped.push({
        row: rowNum,
        reason: `already exists as "${existingUser.username}" — enrollment ensured`,
        data: row,
      });
      continue;
    }

    // Generate username + password
    const username = await uniqueUsername(
      supabase,
      row.first_name,
      row.last_name,
      takenInBatch
    );
    const password = generatePassword();

    // Create auth user with fake email
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authError || !authUser.user) {
      result.errors.push({
        row: rowNum,
        message: `auth create failed: ${authError?.message ?? "unknown"}`,
      });
      continue;
    }

    // Create public.users row
    const { error: profileError } = await supabase.from("users").insert({
      id: authUser.user.id,
      username,
      real_email: row.real_email,
      first_name: row.first_name,
      last_name: row.last_name,
      role: "student",
      student_id: row.student_id || null,
    });

    if (profileError) {
      // Roll back the auth user so we don't leave an orphan
      await supabase.auth.admin.deleteUser(authUser.user.id);
      result.errors.push({
        row: rowNum,
        message: `profile create failed: ${profileError.message}`,
      });
      continue;
    }

    // Create enrollment
    const { error: enrollError } = await supabase
      .from("enrollments")
      .insert({ user_id: authUser.user.id, class_id: targetClassId });

    if (enrollError) {
      result.errors.push({
        row: rowNum,
        message: `enrollment failed: ${enrollError.message}`,
      });
      continue;
    }

    result.created.push({
      username,
      first_name: row.first_name,
      last_name: row.last_name,
      password,
      section: row.section,
    });
  }

  return result;
}

// =============================================================
// Generate a credentials CSV for handing out
// =============================================================
export function credentialsCsv(
  created: ImportResult["created"]
): string {
  const header = "first_name,last_name,username,password,section\n";
  const rows = created
    .map(
      (c) =>
        `${c.first_name},${c.last_name},${c.username},${c.password},${c.section ?? ""}`
    )
    .join("\n");
  return header + rows + "\n";
}