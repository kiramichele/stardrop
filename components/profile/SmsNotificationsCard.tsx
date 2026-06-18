"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Phone,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import {
  startSmsVerification,
  confirmSmsVerification,
  removeSmsPhone,
  setSmsPreference,
} from "@/app/profile/actions";

export type SmsCardSettings = {
  phone: string | null;
  verifiedAt: string | null;
  onFeedback: boolean;
  onDiscussion: boolean;
  onShowcase: boolean;
};

type Step = "enter-phone" | "enter-code" | "verified";

/**
 * Teacher-only profile card for opting into Twilio SMS notifications.
 * Two-step verification: text a code → enter the code → unlock the
 * per-event toggles.
 */
export function SmsNotificationsCard({
  settings,
  isConfigured,
}: {
  settings: SmsCardSettings;
  isConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>(
    settings.verifiedAt ? "verified" : "enter-phone"
  );
  const [rawPhone, setRawPhone] = useState("");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [prefs, setPrefs] = useState({
    feedback: settings.onFeedback,
    discussion: settings.onDiscussion,
    showcase: settings.onShowcase,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <Card>
        <Header />
        <p className="text-sm text-wood-500">
          SMS isn&apos;t set up on this server yet. Set{" "}
          <code className="text-xs">TWILIO_ACCOUNT_SID</code>,{" "}
          <code className="text-xs">TWILIO_AUTH_TOKEN</code>,{" "}
          <code className="text-xs">TWILIO_FROM_NUMBER</code>, and{" "}
          <code className="text-xs">TWILIO_VERIFY_SERVICE_SID</code> in the
          server env, then reload this page.
        </p>
      </Card>
    );
  }

  function sendCode() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await startSmsVerification(rawPhone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingPhone(result.phone);
      setStep("enter-code");
      setNotice(`Code sent to ${result.phone}.`);
    });
  }

  function verify() {
    if (!pendingPhone) return;
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await confirmSmsVerification(pendingPhone, code);
      if (!result.ok) {
        setError(result.error ?? "Couldn't verify.");
        return;
      }
      setStep("verified");
      setCode("");
      setNotice("Phone verified.");
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        "Remove your phone? You'll stop getting any SMS notifications."
      )
    )
      return;
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await removeSmsPhone();
      if (!result.ok) {
        setError(result.error ?? "Couldn't remove.");
        return;
      }
      setStep("enter-phone");
      setRawPhone("");
      setPendingPhone(null);
      setPrefs({ feedback: false, discussion: false, showcase: false });
      router.refresh();
    });
  }

  function togglePref(key: "feedback" | "discussion" | "showcase") {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(null);
    start(async () => {
      const result = await setSmsPreference(key, next[key]);
      if (!result.ok) {
        setPrefs(previous); // roll back
        setError(result.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <Card>
      <Header />
      <p className="text-xs text-wood-500 mb-4">
        Optional heads-up texts when something needs you. Reply{" "}
        <strong>STOP</strong> at any time to opt out.
      </p>

      {step === "enter-phone" && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="sms-phone">Phone number</Label>
            <Input
              id="sms-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={rawPhone}
              onChange={(e) => setRawPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={pending}
            />
            <FieldHint>
              We&apos;ll text a 6-digit code to confirm it&apos;s yours.
            </FieldHint>
          </div>
          <Button
            size="sm"
            onClick={sendCode}
            disabled={pending || rawPhone.trim().length === 0}
          >
            <Phone className="w-4 h-4" strokeWidth={2} />
            {pending ? "Sending…" : "Send verification code"}
          </Button>
        </div>
      )}

      {step === "enter-code" && (
        <div className="space-y-3">
          <p className="text-sm text-wood-600">
            Code sent to <strong className="font-mono">{pendingPhone}</strong>.
          </p>
          <div>
            <Label htmlFor="sms-code">Verification code</Label>
            <Input
              id="sms-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              disabled={pending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={verify}
              disabled={pending || code.trim().length === 0}
            >
              <Check className="w-4 h-4" strokeWidth={2} />
              {pending ? "Verifying…" : "Verify"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStep("enter-phone");
                setCode("");
                setPendingPhone(null);
                setError(null);
                setNotice(null);
              }}
              disabled={pending}
            >
              Use a different number
            </Button>
          </div>
        </div>
      )}

      {step === "verified" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-cozy border border-sage-200 bg-sage-50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-sage-800">
              <Check className="w-4 h-4 flex-shrink-0 text-sage-700" />
              <span className="font-mono">{settings.phone}</span>
              <span className="text-sage-700">verified</span>
            </div>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-wood-500 transition-colors hover:text-terracotta-700 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          <div className="space-y-2">
            <PrefToggle
              id="sms-feedback"
              label="Feedback-thread replies"
              hint="A student replies on a graded submission's feedback thread."
              checked={prefs.feedback}
              onChange={() => togglePref("feedback")}
              disabled={pending}
            />
            <PrefToggle
              id="sms-discussion"
              label="Discussion-board posts"
              hint="Any new post on a discussion board."
              checked={prefs.discussion}
              onChange={() => togglePref("discussion")}
              disabled={pending}
            />
            <PrefToggle
              id="sms-showcase"
              label="New showcase project"
              hint="A student publishes a new game to the showcase."
              checked={prefs.showcase}
              onChange={() => togglePref("showcase")}
              disabled={pending}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-cozy border border-terracotta-200 bg-terracotta-50 px-3 py-2 text-sm text-terracotta-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="mt-3 flex items-start gap-2 rounded-cozy border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-800">
          <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </Card>
  );
}

function Header() {
  return (
    <h3 className="mb-1 flex items-center gap-2 font-display text-lg text-wood-900">
      <Smartphone className="h-5 w-5 text-wood-500" strokeWidth={1.75} />
      Text notifications
    </h3>
  );
}

function PrefToggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
      />
      <span>
        <span className="block text-sm font-medium text-wood-900">{label}</span>
        <span className="block text-xs text-wood-500">{hint}</span>
      </span>
    </label>
  );
}
