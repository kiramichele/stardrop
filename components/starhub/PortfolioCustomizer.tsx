"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  setPortfolioTheme,
  setPortfolioCodeTheme,
  setPortfolioLinks,
  uploadPortfolioBanner,
  removePortfolioBanner,
} from "@/app/starhub/actions";
import {
  PORTFOLIO_THEMES,
  CODE_THEMES,
  PORTFOLIO_LINK_TYPES,
  type PortfolioLink,
  type PortfolioThemeId,
} from "@/lib/starhub";

/**
 * Owner-only "Customize your portfolio" panel: background/accent theme,
 * code snippet color theme, banner image, and social links. Collapsed by
 * default so it doesn't crowd the header for everyone who isn't editing.
 */
export function PortfolioCustomizer({
  theme,
  codeTheme,
  bannerUrl,
  links,
}: {
  theme: PortfolioThemeId;
  codeTheme: string;
  bannerUrl: string | null;
  links: PortfolioLink[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
        <Palette className="w-3.5 h-3.5" strokeWidth={2} />
        {open ? "Hide customization" : "Customize your portfolio"}
      </Button>

      {open && (
        <div className="mt-3 max-w-md space-y-5 rounded-cozy border border-wood-200 bg-cream-50 p-4">
          <ThemeSection initial={theme} onSaved={() => router.refresh()} />
          <CodeThemeSection
            initial={codeTheme}
            onSaved={() => router.refresh()}
          />
          <BannerSection
            initialUrl={bannerUrl}
            onSaved={() => router.refresh()}
          />
          <LinksSection initial={links} onSaved={() => router.refresh()} />
        </div>
      )}
    </div>
  );
}

function SavedTick({ status }: { status: "idle" | "saved" | "error" }) {
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sage-700">
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Saved
      </span>
    );
  }
  return null;
}

function ThemeSection({
  initial,
  onSaved,
}: {
  initial: PortfolioThemeId;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pick(id: PortfolioThemeId) {
    setValue(id);
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await setPortfolioTheme(id);
      if (r.ok) {
        setStatus("saved");
        onSaved();
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
      } else {
        setStatus("error");
        setError(r.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-wood-800">Background & accent</p>
        <SavedTick status={status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {PORTFOLIO_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            disabled={isPending}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
              value === t.id
                ? "border-wood-500 bg-cream-100 text-wood-900"
                : "border-wood-200 text-wood-600 hover:border-wood-300",
            ].join(" ")}
          >
            <span
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ backgroundColor: t.swatch }}
              aria-hidden
            />
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-terracotta-700">{error}</p>}
    </div>
  );
}

function CodeThemeSection({
  initial,
  onSaved,
}: {
  initial: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(id: string) {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await setPortfolioCodeTheme(id);
      if (r.ok) {
        setStatus("saved");
        onSaved();
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
      } else {
        setStatus("error");
        setError(r.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="code-theme" className="mb-0">
          Code snippet colors
        </Label>
        <SavedTick status={status} />
      </div>
      <Select
        id="code-theme"
        defaultValue={initial}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
      >
        {CODE_THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1.5 text-xs text-terracotta-700">{error}</p>}
    </div>
  );
}

function BannerSection({
  initialUrl,
  onSaved,
}: {
  initialUrl: string | null;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("banner", file);
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await uploadPortfolioBanner(fd);
      if (r.ok) {
        setUrl(r.url);
        setStatus("saved");
        onSaved();
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
      } else {
        setStatus("error");
        setError(r.error);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function onRemove() {
    if (!confirm("Remove your banner image?")) return;
    startTransition(async () => {
      const r = await removePortfolioBanner();
      if (r.ok) {
        setUrl(null);
        onSaved();
      } else {
        setStatus("error");
        setError(r.error ?? "Couldn't remove it.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-wood-800">Banner image</p>
        <SavedTick status={status} />
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="mt-1.5 h-16 w-full rounded-cozy object-cover border border-wood-200"
        />
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={2} />
          {url ? "Replace" : "Upload"}
        </Button>
        {url && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            disabled={isPending}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
            Remove
          </Button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-terracotta-700">{error}</p>}
    </div>
  );
}

function LinksSection({
  initial,
  onSaved,
}: {
  initial: PortfolioLink[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const l of initial) map[l.type] = l.url;
    return map;
  });
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setStatus("idle");
    setError(null);
    const links: PortfolioLink[] = PORTFOLIO_LINK_TYPES.map((t) => ({
      type: t.type,
      url: values[t.type] ?? "",
    })).filter((l) => l.url.trim());
    startTransition(async () => {
      const r = await setPortfolioLinks(links);
      if (r.ok) {
        setStatus("saved");
        onSaved();
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
      } else {
        setStatus("error");
        setError(r.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-wood-800">Links</p>
        <SavedTick status={status} />
      </div>
      <div className="mt-1.5 space-y-2">
        {PORTFOLIO_LINK_TYPES.map((t) => (
          <Input
            key={t.type}
            aria-label={t.label}
            placeholder={`${t.label} — ${t.placeholder}`}
            value={values[t.type] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [t.type]: e.target.value }))
            }
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-terracotta-700">{error}</p>}
      <Button
        type="button"
        size="sm"
        className="mt-2"
        onClick={save}
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save links"}
      </Button>
    </div>
  );
}
