"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "./actions";

export function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, start] = useTransition();

  function submit() {
    const u = username.trim().toLowerCase();
    if (!u) {
      setMsg({ text: "Enter your username first.", ok: false });
      return;
    }
    setMsg(null);
    start(async () => {
      const r = await requestPasswordReset(u);
      if (r.ok) {
        setMsg({
          text: "Got it! Ms. Shinn has been notified and will reset your password. You can also just ask her in class.",
          ok: true,
        });
        setUsername("");
      } else {
        setMsg({ text: r.error, ok: false });
      }
    });
  }

  if (!open) {
    return (
      <p className="text-center text-xs text-wood-500 mt-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:text-terracotta-700 underline underline-offset-2 transition-colors"
        >
          Forgot your password?
        </button>
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-cozy border border-wood-200 bg-cream-50/95 backdrop-blur-sm p-4">
      {msg?.ok ? (
        <p className="text-sm text-sage-800">{msg.text}</p>
      ) : (
        <>
          <p className="text-xs text-wood-600 mb-2">
            Enter your username (first initial + last name) and your teacher
            will reset your password.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="firstinitiallastname"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <Button
              onClick={submit}
              disabled={isPending}
              size="sm"
              className="flex-shrink-0"
            >
              {isPending ? "Sending…" : "Send"}
            </Button>
          </div>
          {msg && !msg.ok && (
            <p className="text-xs text-terracotta-800 mt-2">{msg.text}</p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setMsg(null);
        }}
        className="text-xs text-wood-500 hover:text-terracotta-700 mt-3 transition-colors"
      >
        ← Back to sign in
      </button>
    </div>
  );
}
