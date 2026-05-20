"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserMinus, Loader2, KeyRound, ImageOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  moveStudent,
  removeStudentFromClass,
  resetStudentPassword,
  removeStudentAvatar,
} from "../actions";

interface StudentRowProps {
  enrollmentUser: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    real_email: string | null;
    avatar_url: string | null;
  };
  classId: string;
  className: string;
  otherClasses: Array<{ id: string; name: string }>;
}

export function StudentRow({
  enrollmentUser: user,
  classId,
  className,
  otherClasses,
}: StudentRowProps) {
  const [moveSelect, setMoveSelect] = useState("");
  const [isPending, startTransition] = useTransition();
  const [hasAvatar, setHasAvatar] = useState(!!user.avatar_url);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  function handleMove(targetClassId: string) {
    const target = otherClasses.find((c) => c.id === targetClassId);
    if (!target) return;

    const ok = confirm(
      `Move ${user.first_name} ${user.last_name} from "${className}" to "${target.name}"?`
    );
    if (!ok) {
      setMoveSelect("");
      return;
    }

    startTransition(async () => {
      try {
        await moveStudent(user.id, classId, targetClassId);
      } catch (err) {
        alert(
          `Move failed: ${err instanceof Error ? err.message : "unknown error"}`
        );
        setMoveSelect("");
      }
    });
  }

  function handleRemove() {
    const ok = confirm(
      `Remove ${user.first_name} ${user.last_name} from "${className}"?\n\nTheir account stays — they just won't be enrolled in this class anymore.`
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        await removeStudentFromClass(user.id, classId);
      } catch (err) {
        alert(
          `Remove failed: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    });
  }

  function handleResetPassword() {
    const ok = confirm(
      `Reset ${user.first_name} ${user.last_name}'s password?\n\nTheir current password stops working immediately. The new one is emailed to them (if an email is on file) and shown here.`
    );
    if (!ok) return;

    startTransition(async () => {
      const r = await resetStudentPassword(user.id, classId);
      if (r.ok) {
        setResetPassword(r.password);
      } else {
        alert(`Reset failed: ${r.error}`);
      }
    });
  }

  function handleRemovePhoto() {
    const ok = confirm(
      `Remove ${user.first_name} ${user.last_name}'s profile photo?`
    );
    if (!ok) return;

    startTransition(async () => {
      const r = await removeStudentAvatar(user.id, classId);
      if (r.ok) setHasAvatar(false);
      else alert(`Remove failed: ${r.error ?? "unknown error"}`);
    });
  }

  return (
    <div
      className={[
        "group flex items-center gap-3 px-3 py-2.5 rounded-cozy transition-colors duration-150",
        isPending ? "opacity-50 pointer-events-none" : "hover:bg-cream-200",
      ].join(" ")}
    >
      <Avatar
        firstName={user.first_name}
        lastName={user.last_name}
        avatarUrl={hasAvatar ? user.avatar_url : null}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <Link
          href={`/teacher/students/${user.id}`}
          className="block font-medium text-wood-900 truncate hover:text-terracotta-700 transition-colors"
        >
          {user.first_name} {user.last_name}
        </Link>
        <p className="text-xs text-wood-500 truncate font-mono">
          {user.username}
          {user.real_email && (
            <>
              <span className="text-wood-300 mx-1.5">·</span>
              <span className="font-sans">{user.real_email}</span>
            </>
          )}
        </p>
        {resetPassword && (
          <p className="text-xs text-honey-700 mt-0.5">
            New password:{" "}
            <span className="font-mono font-semibold">{resetPassword}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        {isPending && (
          <Loader2
            className="w-3.5 h-3.5 text-wood-500 animate-spin"
            aria-label="Working…"
          />
        )}

        {otherClasses.length > 0 && (
          <select
            value={moveSelect}
            onChange={(e) => {
              setMoveSelect(e.target.value);
              if (e.target.value) handleMove(e.target.value);
            }}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded-cozy border border-wood-200 bg-white text-wood-700 hover:border-wood-300 focus:outline-none focus:border-terracotta-400 focus:shadow-focus-warm disabled:opacity-50"
            aria-label={`Move ${user.first_name} ${user.last_name} to another class`}
          >
            <option value="">Move to…</option>
            {otherClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={isPending}
          className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50 transition-colors"
          title="Reset password"
          aria-label={`Reset ${user.first_name} ${user.last_name}'s password`}
        >
          <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>

        {hasAvatar && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={isPending}
            className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50 transition-colors"
            title="Remove profile photo"
            aria-label={`Remove ${user.first_name} ${user.last_name}'s profile photo`}
          >
            <ImageOff className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50 transition-colors"
          title="Remove from class"
          aria-label={`Remove ${user.first_name} ${user.last_name} from class`}
        >
          <UserMinus className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
