"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Trash2,
  KeyRound,
  AlertCircle,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/Input";
import {
  uploadAvatar,
  removeOwnAvatar,
  resetOwnPassword,
  updatePreferences,
  updateStarHubIdentity,
} from "./actions";
import type { UserProfile } from "@/lib/profile";
import {
  SmsNotificationsCard,
  type SmsCardSettings,
} from "@/components/profile/SmsNotificationsCard";

export function ProfilePanels({
  profile,
  smsSettings,
  smsConfigured,
  initialBio = "",
  initialStudio = "",
}: {
  profile: UserProfile;
  smsSettings?: SmsCardSettings | null;
  smsConfigured?: boolean;
  initialBio?: string;
  initialStudio?: string;
}) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [emailNotif, setEmailNotif] = useState(profile.email_notifications);
  const [reducedMotion, setReducedMotion] = useState(profile.reduced_motion);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // StarHub identity fields.
  const [bio, setBio] = useState(initialBio);
  const [studio, setStudio] = useState(initialStudio);
  const dirty = bio !== initialBio || studio !== initialStudio;

  function notify(text: string, error = false) {
    setMsg({ text, error });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      const r = await uploadAvatar(fd);
      if (r.ok) {
        setAvatarUrl(r.url);
        notify("Photo updated.");
        router.refresh();
      } else {
        notify(r.error, true);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function onRemovePhoto() {
    if (!confirm("Remove your profile photo?")) return;
    startTransition(async () => {
      const r = await removeOwnAvatar();
      if (r.ok) {
        setAvatarUrl(null);
        notify("Photo removed.");
        router.refresh();
      } else {
        notify(r.error ?? "Couldn't remove photo", true);
      }
    });
  }

  function onResetPassword() {
    if (
      !confirm(
        "Reset your password? Your current password stops working right away."
      )
    )
      return;
    startTransition(async () => {
      const r = await resetOwnPassword();
      if (r.ok) {
        setNewPassword(r.password);
        notify(
          r.emailed
            ? "Password reset — the new one was emailed to you."
            : "Password reset. We couldn't send the email — save the password below."
        );
      } else {
        notify(r.error, true);
      }
    });
  }

  function savePrefs(next: {
    emailNotifications: boolean;
    reducedMotion: boolean;
  }) {
    startTransition(async () => {
      const r = await updatePreferences(next);
      if (r.ok) {
        notify("Preferences saved.");
        router.refresh();
      } else {
        notify(r.error ?? "Couldn't save", true);
      }
    });
  }

  function saveIdentity() {
    startTransition(async () => {
      const r = await updateStarHubIdentity({ bio, studio });
      if (r.ok) {
        notify("StarHub identity saved.");
        router.refresh();
      } else {
        notify(r.error ?? "Couldn't save", true);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {msg && (
        <div
          className={[
            "flex items-start gap-2 px-3 py-2 rounded-cozy border text-sm",
            msg.error
              ? "bg-terracotta-50 border-terracotta-200 text-terracotta-800"
              : "bg-sage-50 border-sage-200 text-sage-800",
          ].join(" ")}
        >
          {msg.error ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <Card>
        <h3 className="font-display text-lg text-wood-900 mb-4">
          Profile photo
        </h3>
        <div className="flex items-center gap-5">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={avatarUrl}
            size="lg"
          />
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
            >
              <Camera className="w-4 h-4" strokeWidth={2} />
              {avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {avatarUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemovePhoto}
                disabled={isPending}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-wood-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-terracotta-600" strokeWidth={1.75} />
              StarHub identity
            </h3>
            <p className="text-xs text-wood-500 mt-1">
              How you show up on your portfolio page.
            </p>
          </div>
          <Link
            href={`/starhub/${profile.username}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800 flex-shrink-0"
          >
            View StarHub
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="studio">
              Studio or role{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="studio"
              value={studio}
              onChange={(e) => setStudio(e.target.value)}
              placeholder="e.g. Indie Dev, Pixel Artist, Sound Designer"
              maxLength={60}
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="bio">
              Short bio{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A couple of sentences about you and what you're into."
              rows={3}
              maxLength={600}
              disabled={isPending}
            />
            <FieldHint>Up to 600 characters.</FieldHint>
          </div>
          <Button
            size="sm"
            onClick={saveIdentity}
            disabled={isPending || !dirty}
          >
            Save StarHub identity
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-wood-900 mb-4">Account</h3>
        <dl className="space-y-2 text-sm mb-4">
          <div className="flex gap-2">
            <dt className="text-wood-500 w-24 flex-shrink-0">Username</dt>
            <dd className="text-wood-900 font-mono">{profile.username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-wood-500 w-24 flex-shrink-0">Email</dt>
            <dd className="text-wood-900">
              {profile.real_email ?? (
                <span className="text-wood-400 italic">none on file</span>
              )}
            </dd>
          </div>
        </dl>
        <Button size="sm" onClick={onResetPassword} disabled={isPending}>
          <KeyRound className="w-4 h-4" strokeWidth={2} />
          Reset my password
        </Button>
        {newPassword && (
          <div className="mt-3 p-3 rounded-cozy bg-honey-50 border border-honey-200">
            <p className="text-xs text-honey-800 mb-1">
              Your new password — write it down somewhere safe:
            </p>
            <p className="font-mono text-base text-wood-900">{newPassword}</p>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-lg text-wood-900 mb-4">
          Display preferences
        </h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotif}
              disabled={isPending}
              onChange={(e) => {
                setEmailNotif(e.target.checked);
                savePrefs({
                  emailNotifications: e.target.checked,
                  reducedMotion,
                });
              }}
              className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
            />
            <span>
              <span className="block text-sm font-medium text-wood-900">
                Email notifications
              </span>
              <span className="block text-xs text-wood-500">
                Get an email when something needs you — like a reply to your
                feedback.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reducedMotion}
              disabled={isPending}
              onChange={(e) => {
                setReducedMotion(e.target.checked);
                savePrefs({
                  emailNotifications: emailNotif,
                  reducedMotion: e.target.checked,
                });
              }}
              className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
            />
            <span>
              <span className="block text-sm font-medium text-wood-900">
                Reduced motion
              </span>
              <span className="block text-xs text-wood-500">
                Turn off fade and slide animations across the app.
              </span>
            </span>
          </label>
        </div>
      </Card>

      {profile.role === "teacher" && smsSettings && (
        <SmsNotificationsCard
          settings={smsSettings}
          isConfigured={smsConfigured ?? false}
        />
      )}
    </div>
  );
}
