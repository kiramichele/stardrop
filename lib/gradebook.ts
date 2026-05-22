// Client-safe: Canvas gradebook CSV parsing + the pure merge logic.
// No supabase / next/headers imports here — all DB work lives in
// lib/gradebook-server.ts, which feeds plain data into mergeGradesIntoTemplate.
//
// The flow: a teacher exports their gradebook from Canvas (Grades →
// Export) and uploads that CSV as the "template". On export we re-emit
// that exact file with app grades dropped into the assignment cells. The
// identity columns (Student / ID / SIS User ID / SIS Login ID / Section)
// and the "Points Possible" row are copied through untouched, so Canvas
// matches every row on re-import.
//
// A Canvas gradebook export looks like:
//
//   Student,ID,SIS User ID,SIS Login ID,Section,Quiz 1 (123),Project (124),Current Score
//   Points Possible,,,,,50,100,
//   "Smith, John",101,S101,john@school.edu,Period 1,46,88,
//   ...

import Papa from "papaparse";

// =============================================================
// Parsing the uploaded template
// =============================================================

/** Headers Canvas treats as metadata, not gradable assignments. Lowercased. */
const RESERVED_HEADERS = new Set([
  "student",
  "id",
  "sis user id",
  "sis login id",
  "integration id",
  "section",
  "current score",
  "current points",
  "current grade",
  "final score",
  "final points",
  "final grade",
  "unposted current score",
  "unposted current points",
  "unposted current grade",
  "unposted final score",
  "unposted final points",
  "unposted final grade",
  "override score",
  "override grade",
]);

export type TemplateColumn = {
  /** 0-based index of the column in each CSV row. */
  index: number;
  /** Raw header text, e.g. "Quiz 1 (12345)". */
  rawHeader: string;
  /** Header with any trailing Canvas " (12345)" id stripped. */
  title: string;
};

export type TemplateRow = {
  /** Row index within the parsed grid (>= 1; grid[0] is the header). */
  index: number;
  /** "Last, First", exactly as Canvas wrote it. */
  studentName: string;
  canvasId: string;
  sisUserId: string;
  sisLoginId: string;
  section: string;
};

export type ParsedTemplate = {
  /** The whole CSV as a grid of strings; header at grid[0]. */
  grid: string[][];
  /** Column index for each identity field, or -1 if the column is absent. */
  cols: {
    student: number;
    id: number;
    sisUserId: number;
    sisLoginId: number;
    section: number;
  };
  /** Grid row index of the "Points Possible" row, or -1 if absent. */
  pointsRowIndex: number;
  /** Gradable assignment columns, in CSV order. */
  assignments: TemplateColumn[];
  /** Real student rows (excludes the header and "Points Possible" rows). */
  students: TemplateRow[];
};

export type ParseResult =
  | { ok: true; template: ParsedTemplate }
  | { ok: false; error: string };

/** Strip a trailing Canvas id, e.g. "Quiz 1 (12345)" → "Quiz 1". */
export function stripAssignmentId(header: string): string {
  return header.replace(/\s*\(\d+\)\s*$/, "").trim();
}

/** Normalize an assignment title for case/whitespace-insensitive matching. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normalize a person's name for matching ("Smith, John" ≈ "Smith,John"). */
export function normalizePersonName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function headerIndex(headers: string[], name: string): number {
  const target = name.toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === target);
}

/**
 * Is this header a metadata column rather than a gradable assignment?
 * Canvas writes its computed columns with a trailing note, e.g.
 * "Current Score (entire course)" — so a trailing "(…)" is stripped
 * before the reserved-name check. Assignment ids "(12345)" are numeric,
 * so a real assignment never collapses onto a reserved name this way.
 */
function isReservedHeader(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (RESERVED_HEADERS.has(lower)) return true;
  const withoutParen = lower.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return RESERVED_HEADERS.has(withoutParen);
}

export function parseCanvasTemplate(csvText: string): ParseResult {
  // Canvas exports are often UTF-8 with a BOM — drop it before parsing.
  const clean =
    csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const parsed = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy" });
  const grid = (parsed.data ?? []).filter((r) => Array.isArray(r));

  if (grid.length === 0) {
    return { ok: false, error: "That file is empty." };
  }

  const headers = grid[0].map((h) => (h ?? "").toString());
  const cols = {
    student: headerIndex(headers, "Student"),
    id: headerIndex(headers, "ID"),
    sisUserId: headerIndex(headers, "SIS User ID"),
    sisLoginId: headerIndex(headers, "SIS Login ID"),
    section: headerIndex(headers, "Section"),
  };

  if (cols.student === -1) {
    return {
      ok: false,
      error:
        'This doesn\'t look like a Canvas gradebook export — no "Student" column was found. In Canvas, open Grades, choose Export, and upload that CSV.',
    };
  }

  // Assignment columns: every non-empty header that isn't reserved metadata.
  const assignments: TemplateColumn[] = [];
  headers.forEach((raw, index) => {
    if (isReservedHeader(raw)) return;
    assignments.push({ index, rawHeader: raw, title: stripAssignmentId(raw) });
  });

  // The "Points Possible" row (if any) sits just below the header.
  let pointsRowIndex = -1;
  const students: TemplateRow[] = [];
  const cellAt = (row: string[], c: number) =>
    c === -1 ? "" : (row[c] ?? "").toString().trim();

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const studentCell = cellAt(row, cols.student);

    if (
      pointsRowIndex === -1 &&
      studentCell.toLowerCase() === "points possible"
    ) {
      pointsRowIndex = i;
      continue;
    }

    const canvasId = cellAt(row, cols.id);
    const sisUserId = cellAt(row, cols.sisUserId);
    const sisLoginId = cellAt(row, cols.sisLoginId);
    // A row with no name and no identifiers is blank/metadata — skip it as
    // a student, but it still rides through untouched in the grid.
    if (!studentCell && !canvasId && !sisUserId && !sisLoginId) continue;

    students.push({
      index: i,
      studentName: studentCell,
      canvasId,
      sisUserId,
      sisLoginId,
      section: cellAt(row, cols.section),
    });
  }

  return {
    ok: true,
    template: { grid, cols, pointsRowIndex, assignments, students },
  };
}

// =============================================================
// Merging app grades into the template
// =============================================================

export type AppStudent = {
  /** App user id. */
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  /** Stored district / SIS student number. */
  studentId: string | null;
};

export type AppGradeCell = {
  /** normalizeTitle() of the assignment title. */
  titleNorm: string;
  /** Name of the class the assignment belongs to. */
  section: string;
  score: number | null;
  excused: boolean;
};

export type AppData = {
  students: AppStudent[];
  /** appStudentId → that student's grade cells. */
  gradesByStudent: Map<string, AppGradeCell[]>;
  /** Distinct published assignment titles in the app, with point values. */
  appAssignmentTitles: { title: string; points: number }[];
};

export type MatchReport = {
  /** Template rows successfully linked to an app student. */
  matched: number;
  /** Total template student rows. */
  templateRowCount: number;
  /** Template rows with no app-student match (their names). */
  unmatchedTemplateRows: string[];
  /** App students found nowhere in the template (display names). */
  unmatchedAppStudents: string[];
  /** App students with no student_id stored yet (display names). */
  missingStudentId: string[];
  /** Template assignment columns with no matching app assignment (titles). */
  unmatchedTemplateColumns: string[];
  /** App assignments appended to the file as new columns (titles). */
  newColumns: string[];
  /** Total grade cells written into the file. */
  cellsWritten: number;
};

export type MergeResult = { csv: string; report: MatchReport };

/**
 * Resolve a grade cell value for one assignment column: "EX" when excused,
 * the score as a string when graded, or null to leave the template cell as
 * it was (we never blank out data the template already had).
 */
function gradeValueFor(
  cells: AppGradeCell[],
  columnTitle: string,
  section: string
): string | null {
  const want = normalizeTitle(columnTitle);
  const matches = cells.filter((c) => c.titleNorm === want);
  if (matches.length === 0) return null;

  // A student is normally in one class; the section tiebreaker only matters
  // for the rare case of same-named assignments across two classes.
  const sectionNorm = section.trim().toLowerCase();
  const chosen =
    matches.find((c) => c.section.trim().toLowerCase() === sectionNorm) ??
    matches[0];

  if (chosen.excused) return "EX";
  if (chosen.score !== null) return String(chosen.score);
  return null;
}

/**
 * Re-emit the template CSV with app grades filled into the assignment
 * cells. Identity columns and the Points Possible row pass through
 * unchanged; assignments the app has but the template doesn't are appended
 * as new (id-less) columns, which Canvas treats as new assignments.
 */
export function mergeGradesIntoTemplate(
  template: ParsedTemplate,
  app: AppData
): MergeResult {
  // Mutable, rectangular copy of the grid.
  const grid = template.grid.map((r) => r.map((c) => (c ?? "").toString()));
  let width = grid.reduce((w, r) => Math.max(w, r.length), 0);
  for (const r of grid) {
    while (r.length < width) r.push("");
  }

  // ---- App-side lookup maps ----------------------------------
  const norm = (s: string) => s.trim().toLowerCase();
  const byIdentifier = new Map<string, AppStudent>();
  const byEmail = new Map<string, AppStudent>();
  const byName = new Map<string, AppStudent>();
  for (const s of app.students) {
    if (s.studentId) byIdentifier.set(norm(s.studentId), s);
    if (s.email) byEmail.set(norm(s.email), s);
    byName.set(normalizePersonName(`${s.lastName},${s.firstName}`), s);
  }

  const consumed = new Set<string>(); // app student ids already placed

  function matchRow(row: TemplateRow): AppStudent | null {
    const sis = norm(row.sisUserId);
    const cid = norm(row.canvasId);
    const login = norm(row.sisLoginId);
    const candidates: (AppStudent | undefined)[] = [
      // Stored student_id vs. any identifier column Canvas provides.
      sis ? byIdentifier.get(sis) : undefined,
      cid ? byIdentifier.get(cid) : undefined,
      login ? byIdentifier.get(login) : undefined,
      // School email vs. SIS Login ID.
      login ? byEmail.get(login) : undefined,
      // Last resort: "Last, First" name.
      row.studentName
        ? byName.get(normalizePersonName(row.studentName))
        : undefined,
    ];
    for (const c of candidates) {
      if (c && !consumed.has(c.id)) return c;
    }
    return null;
  }

  const report: MatchReport = {
    matched: 0,
    templateRowCount: template.students.length,
    unmatchedTemplateRows: [],
    unmatchedAppStudents: [],
    missingStudentId: [],
    unmatchedTemplateColumns: [],
    newColumns: [],
    cellsWritten: 0,
  };

  // ---- Fill the template's existing assignment columns -------
  const rowForApp = new Map<string, TemplateRow>();
  for (const row of template.students) {
    const student = matchRow(row);
    if (!student) {
      report.unmatchedTemplateRows.push(row.studentName || "(unnamed row)");
      continue;
    }
    consumed.add(student.id);
    rowForApp.set(student.id, row);
    report.matched++;

    const cells = app.gradesByStudent.get(student.id) ?? [];
    for (const col of template.assignments) {
      const value = gradeValueFor(cells, col.title, row.section);
      if (value !== null) {
        grid[row.index][col.index] = value;
        report.cellsWritten++;
      }
    }
  }

  // ---- Append columns for app assignments not in the template -
  const templateTitleNorms = new Set(
    template.assignments.map((c) => normalizeTitle(c.title))
  );
  const seenNew = new Set<string>();
  const newCols = app.appAssignmentTitles
    .filter((a) => {
      const n = normalizeTitle(a.title);
      if (!n || templateTitleNorms.has(n) || seenNew.has(n)) return false;
      seenNew.add(n);
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  for (const assignment of newCols) {
    const colIndex = width;
    width++;
    for (const r of grid) r.push("");
    grid[0][colIndex] = assignment.title;
    if (template.pointsRowIndex !== -1) {
      grid[template.pointsRowIndex][colIndex] = String(assignment.points);
    }
    for (const [appId, row] of rowForApp) {
      const cells = app.gradesByStudent.get(appId) ?? [];
      const value = gradeValueFor(cells, assignment.title, row.section);
      if (value !== null) {
        grid[row.index][colIndex] = value;
        report.cellsWritten++;
      }
    }
    report.newColumns.push(assignment.title);
  }

  // ---- Leftovers, for the teacher's review -------------------
  const appTitleNorms = new Set(
    app.appAssignmentTitles.map((a) => normalizeTitle(a.title))
  );
  for (const col of template.assignments) {
    if (!appTitleNorms.has(normalizeTitle(col.title))) {
      report.unmatchedTemplateColumns.push(col.title);
    }
  }
  for (const s of app.students) {
    const display = `${s.firstName} ${s.lastName}`.trim() || "(unnamed)";
    if (!consumed.has(s.id)) report.unmatchedAppStudents.push(display);
    if (!s.studentId) report.missingStudentId.push(display);
  }
  report.unmatchedAppStudents.sort((a, b) => a.localeCompare(b));
  report.missingStudentId.sort((a, b) => a.localeCompare(b));

  // BOM so accented names render correctly when opened in Excel.
  const csv = String.fromCharCode(0xfeff) + Papa.unparse(grid);
  return { csv, report };
}
