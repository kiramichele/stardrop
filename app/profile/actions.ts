"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateProfileColumns } from "@/lib/profile-server";
import { updateSmsColumns } from "@/lib/sms-server";
import {
  normalizePhone,
  startPhoneVerification,
  checkPhoneVerification,
} from "@/lib/sms";
import { generatePassword } from "@/lib/csv";
import { sendNewPasswordEmail } from "@/lib/email";

export async function uploadAvatar(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file provided" };
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Please choose an image file." };
  }

  const admin = createAdminClient();
  // ArrayBuffer (not File) so storage-js honors contentType.
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(user.id, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(user.id);
  // Cache-bust: the storage key is the (stable) user id, so without a
  // changing query param the browser keeps showing the old photo.
  const url = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await updateProfileColumns(admin, user.id, {
    avatar_url: url,
  });
  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, url };
}

export async function removeOwnAvatar(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = createAdminClient();
  await admin.storage.from("avatars").remove([user.id]);
  const { error } = await updateProfileColumns(admin, user.id, {
    avatar_url: null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetOwnPassword(): Promise<
  | { ok: true; password: string; emailed: boolean }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const newPassword = generatePassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };

  let emailed = false;
  if (user.real_email) {
    const result = await sendNewPasswordEmail(
      user.real_email,
      user.first_name,
      newPassword
    );
    emailed = result.ok;
  }

  return { ok: true, password: newPassword, emailed };
}

export async function updatePreferences(prefs: {
  emailNotifications: boolean;
  reducedMotion: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = createAdminClient();
  const { error } = await updateProfileColumns(admin, user.id, {
    email_notifications: prefs.emailNotifications,
    reduced_motion: prefs.reducedMotion,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

// =============================================================
// SMS notifications (teacher-only opt-in)
// =============================================================

type SmsPrefKey = "feedback" | "discussion" | "showcase";

function isSmsPrefKey(v: string): v is SmsPrefKey {
  return v === "feedback" || v === "discussion" || v === "showcase";
}

/** Text a verification code to a phone number (Twilio Verify). */
export async function startSmsVerification(
  rawPhone: string
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { ok: false, error: "Not authorized" };
  }
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return {
      ok: false,
      error: "That doesn't look like a phone number — try (555) 123-4567.",
    };
  }
  const result = await startPhoneVerification(phone);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, phone };
}

/** Confirm the texted code and store the (now verified) phone number. */
export async function confirmSmsVerification(
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { ok: false, error: "Not authorized" };
  }
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return { ok: false, error: "Invalid phone." };
  const cleanCode = code.trim();
  if (!/^\d{4,10}$/.test(cleanCode)) {
    return { ok: false, error: "Enter the code from your text." };
  }

  const check = await checkPhoneVerification(cleanPhone, cleanCode);
  if (!check.ok) return { ok: false, error: check.error };

  const saved = await updateSmsColumns(user.id, {
    phone_number: cleanPhone,
    phone_verified_at: new Date().toISOString(),
  });
  if (!saved.ok) return { ok: false, error: saved.error ?? "Couldn't save." };

  revalidatePath("/profile");
  return { ok: true };
}

/** Drop the phone number and turn every SMS toggle off. */
export async function removeSmsPhone(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { ok: false, error: "Not authorized" };
  }
  const saved = await updateSmsColumns(user.id, {
    phone_number: null,
    phone_verified_at: null,
    sms_on_feedback: false,
    sms_on_discussion: false,
    sms_on_showcase: false,
  });
  if (!saved.ok) return { ok: false, error: saved.error ?? "Couldn't save." };

  revalidatePath("/profile");
  return { ok: true };
}

/** Flip one of the per-event SMS toggles. */
export async function setSmsPreference(
  key: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { ok: false, error: "Not authorized" };
  }
  if (!isSmsPrefKey(key)) return { ok: false, error: "Unknown preference." };

  const col =
    key === "feedback"
      ? "sms_on_feedback"
      : key === "discussion"
        ? "sms_on_discussion"
        : "sms_on_showcase";

  const saved = await updateSmsColumns(user.id, { [col]: enabled });
  if (!saved.ok) return { ok: false, error: saved.error ?? "Couldn't save." };

  revalidatePath("/profile");
  return { ok: true };
}
