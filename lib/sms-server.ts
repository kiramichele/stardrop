import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, isSmsConfigured } from "@/lib/sms";

// phone_number / phone_verified_at / sms_on_* aren't in types/database.ts
// until a regen runs (which only keeps them once the migration is
// applied). These helpers reach them through a typed cast so the app
// builds either way — same shim pattern as the other recent migrations.

type Admin = ReturnType<typeof createAdminClient>;
type DbError = { message: string } | null;

interface SelectChain<T> extends PromiseLike<{ data: T[] | null; error: DbError }> {
  eq(col: string, val: string): SelectChain<T>;
  in(col: string, vals: readonly string[]): SelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: DbError }>;
}

interface MutateChain extends PromiseLike<{ error: DbError }> {
  eq(col: string, val: string): MutateChain;
}

interface UsersTable<T> {
  select(cols: string): SelectChain<T>;
  update(patch: Record<string, unknown>): MutateChain;
}

type UserSmsRow = {
  id: string;
  phone_number: string | null;
  phone_verified_at: string | null;
  sms_on_feedback: boolean | null;
  sms_on_discussion: boolean | null;
  sms_on_showcase: boolean | null;
};

const SMS_COLS =
  "id, phone_number, phone_verified_at, sms_on_feedback, sms_on_discussion, sms_on_showcase";

function usersSms(admin: Admin): UsersTable<UserSmsRow> {
  return (
    admin as unknown as { from: (t: string) => UsersTable<UserSmsRow> }
  ).from("users");
}

// =============================================================
// Per-teacher settings (UI)
// =============================================================

export type TeacherSmsSettings = {
  phone: string | null;
  verifiedAt: string | null;
  onFeedback: boolean;
  onDiscussion: boolean;
  onShowcase: boolean;
};

export async function getTeacherSmsSettings(
  userId: string
): Promise<TeacherSmsSettings> {
  const { data } = await usersSms(createAdminClient())
    .select(SMS_COLS)
    .eq("id", userId)
    .maybeSingle();
  return {
    phone: data?.phone_number ?? null,
    verifiedAt: data?.phone_verified_at ?? null,
    onFeedback: Boolean(data?.sms_on_feedback),
    onDiscussion: Boolean(data?.sms_on_discussion),
    onShowcase: Boolean(data?.sms_on_showcase),
  };
}

export type SmsColumnPatch = Partial<{
  phone_number: string | null;
  phone_verified_at: string | null;
  sms_on_feedback: boolean;
  sms_on_discussion: boolean;
  sms_on_showcase: boolean;
}>;

export async function updateSmsColumns(
  userId: string,
  patch: SmsColumnPatch
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await usersSms(createAdminClient())
    .update(patch)
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// =============================================================
// Teacher fan-out — fire-and-forget
// =============================================================

export type SmsEvent = "feedback" | "discussion" | "showcase";

const COLUMN_BY_EVENT: Record<SmsEvent, keyof UserSmsRow> = {
  feedback: "sms_on_feedback",
  discussion: "sms_on_discussion",
  showcase: "sms_on_showcase",
};

/**
 * Text every teacher who has a verified phone AND has opted in to this
 * event type. Best-effort: a Twilio outage never fails the caller. Safe
 * to `void` from any action.
 */
export async function notifyTeachersBySms(
  event: SmsEvent,
  body: string
): Promise<void> {
  if (!isSmsConfigured()) return;
  const admin = createAdminClient();

  const { data: teachers } = await admin
    .from("users")
    .select("id")
    .eq("role", "teacher");
  const ids = (teachers ?? []).map((t) => t.id);
  if (ids.length === 0) return;

  const { data: rows } = await usersSms(admin).select(SMS_COLS).in("id", ids);
  const column = COLUMN_BY_EVENT[event];

  await Promise.all(
    (rows ?? [])
      .filter(
        (row) =>
          row.phone_number && row.phone_verified_at && Boolean(row[column])
      )
      .map((row) =>
        sendSms({ to: row.phone_number as string, body }).catch(() => {
          /* swallow — best-effort */
        })
      )
  );
}
