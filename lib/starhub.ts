// Client-safe: StarHub types, kind labels, and pure helpers.
// Server-only queries live in lib/starhub-server.ts; code highlighting
// lives in lib/code-highlight.ts (server-only, depends on shiki).

import type { SubmissionMedia } from "@/lib/assignments";

/** One social/portfolio link a student has added to their header. */
export type PortfolioLink = {
  type: PortfolioLinkType;
  url: string;
};

/** Public identity slice for the StarHub header + entry attribution. */
export type StarHubIdentity = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  studio: string | null;
  /** Student opted in to a no-login share link at /portfolio/[username]. */
  portfolioPublic: boolean;
  /** Background/accent preset — see PORTFOLIO_THEMES. */
  theme: PortfolioThemeId;
  /** Shiki theme id for this student's code snippets — see CODE_THEMES. */
  codeTheme: string;
  bannerUrl: string | null;
  links: PortfolioLink[];
};

// =============================================================
// Portfolio customization: theme, code theme, links
// =============================================================

/**
 * Background/accent presets for the portfolio header + page background.
 * Deliberately just a background + accent (Tailwind classes, not literal
 * hex) so every preset gets dark-mode support for free from the app's
 * existing color tokens, and entry cards themselves stay neutral —
 * cards keep reading cleanly no matter which preset is picked.
 *
 * NOTE: the token names (terracotta/sage/honey/wood) don't match their
 * actual rendered hues after a past rebrand — terracotta renders green,
 * sage renders teal. Preset ids/labels below describe what actually
 * shows on screen, not the misleading token name.
 */
export type PortfolioThemeId = "meadow" | "tide" | "ember" | "slate";

export interface PortfolioTheme {
  id: PortfolioThemeId;
  label: string;
  /** Small hex used only for the picker's preview swatch. */
  swatch: string;
  pageBgClass: string;
  accentTextClass: string;
  accentBorderClass: string;
  chipBgClass: string;
}

export const PORTFOLIO_THEMES: PortfolioTheme[] = [
  {
    id: "meadow",
    label: "Meadow",
    swatch: "#10b981",
    pageBgClass: "bg-terracotta-50",
    accentTextClass: "text-terracotta-700",
    accentBorderClass: "border-terracotta-200",
    chipBgClass: "bg-terracotta-100",
  },
  {
    id: "tide",
    label: "Tide",
    swatch: "#14b8a6",
    pageBgClass: "bg-sage-50",
    accentTextClass: "text-sage-700",
    accentBorderClass: "border-sage-200",
    chipBgClass: "bg-sage-100",
  },
  {
    id: "ember",
    label: "Ember",
    swatch: "#f59e0b",
    pageBgClass: "bg-honey-50",
    accentTextClass: "text-honey-700",
    accentBorderClass: "border-honey-200",
    chipBgClass: "bg-honey-100",
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "#4f6c8d",
    pageBgClass: "bg-wood-50",
    accentTextClass: "text-wood-700",
    accentBorderClass: "border-wood-200",
    chipBgClass: "bg-wood-100",
  },
];

const DEFAULT_THEME_ID: PortfolioThemeId = "meadow";

export function resolvePortfolioTheme(id: string | null | undefined): PortfolioTheme {
  return (
    PORTFOLIO_THEMES.find((t) => t.id === id) ??
    PORTFOLIO_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!
  );
}

/**
 * Shiki themes offered for code snippets. Ids must match shiki's bundled
 * theme names exactly (see lib/code-highlight.ts, which registers all of
 * these up front).
 */
export const CODE_THEMES: { id: string; label: string }[] = [
  { id: "github-light", label: "GitHub Light" },
  { id: "github-dark", label: "GitHub Dark" },
  { id: "dracula", label: "Dracula" },
  { id: "nord", label: "Nord" },
  { id: "monokai", label: "Monokai" },
  { id: "one-dark-pro", label: "One Dark Pro" },
];

export const DEFAULT_CODE_THEME = "github-light";

export function resolveCodeTheme(id: string | null | undefined): string {
  return CODE_THEMES.some((t) => t.id === id) ? id! : DEFAULT_CODE_THEME;
}

/** Fixed set of link types a student can add — keeps the header tidy and
 * every link recognizable at a glance instead of a free-for-all list. */
export type PortfolioLinkType = "github" | "itch" | "linkedin" | "website";

export const PORTFOLIO_LINK_TYPES: {
  type: PortfolioLinkType;
  label: string;
  placeholder: string;
}[] = [
  { type: "github", label: "GitHub", placeholder: "https://github.com/you" },
  { type: "itch", label: "itch.io", placeholder: "https://you.itch.io" },
  {
    type: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/you",
  },
  { type: "website", label: "Website", placeholder: "https://your-site.com" },
];

export const PORTFOLIO_LINKS_MAX = PORTFOLIO_LINK_TYPES.length;

/** A free-form code post — the gist-style portfolio entry. */
export type PortfolioGist = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * One thing on a student's StarHub. A union over the three sources:
 * a submission (auto-posted from an assignment), a free-form gist, or
 * a published showcase project.
 *
 * The card renderer dispatches on `kind`.
 */
export type PortfolioEntry =
  | {
      kind: "submission";
      id: string; // submission id
      title: string; // assignment title
      assignmentId: string;
      assignmentType: string;
      content: string | null;
      structuredData: unknown;
      uploadedFiles: SubmissionMedia[];
      score: number | null;
      maxPoints: number;
      isPublic: boolean;
      createdAt: string;
    }
  | {
      kind: "gist";
      id: string;
      title: string;
      description: string | null;
      language: string;
      code: string;
      isPublic: boolean;
      createdAt: string;
    }
  | {
      kind: "showcase";
      id: string;
      title: string;
      description: string | null;
      thumbnailPath: string | null;
      indexPath: string | null;
      isPublic: boolean;
      createdAt: string;
    }
  | {
      kind: "post";
      id: string;
      body: string | null;
      media: SubmissionMedia[];
      isPublic: boolean;
      createdAt: string;
    };

/** Public URL for a StarHub post-media object (the `starhub` bucket). */
export function starhubMediaUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/starhub/${storagePath}`;
}

/** Category filters on the portfolio feed. */
export type PortfolioFilter =
  | "all"
  | "post"
  | "code"
  | "video"
  | "writing"
  | "gist"
  | "showcase";

export const PORTFOLIO_FILTERS: { key: PortfolioFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "post", label: "Posts" },
  { key: "code", label: "Code" },
  { key: "video", label: "Videos" },
  { key: "writing", label: "Writing" },
  { key: "gist", label: "Gists" },
  { key: "showcase", label: "Showcase" },
];

/** Which filter bucket an entry falls into. */
export function entryFilterBucket(entry: PortfolioEntry): PortfolioFilter {
  if (entry.kind === "post") return "post";
  if (entry.kind === "gist") return "gist";
  if (entry.kind === "showcase") return "showcase";
  // submission — by assignment type
  const t = entry.assignmentType;
  if (t === "code") return "code";
  if (t === "devlog" || t === "video_response") return "video";
  if (t === "short_answer" || t === "discussion") return "writing";
  return "all"; // interactive_html, unity_upload, check_in — show in "All" only
}

/** Display name — first + last initial. */
export function starHubDisplayName(i: StarHubIdentity): string {
  const first = i.firstName.trim();
  const last = i.lastName.trim();
  if (!first && !last) return i.username;
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}

/**
 * Languages students can pick when composing a gist. Same two-flavour
 * split as the playground (plain console vs Unity).
 */
export const GIST_LANGUAGES: { key: string; label: string }[] = [
  { key: "csharp", label: "C#" },
  { key: "csharp_unity", label: "C# (Unity)" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic short date — no hydration drift. */
export function formatStarHubDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return "";
  const monthIndex = Number(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${MONTHS[monthIndex]} ${Number(parts[2])}, ${parts[0]}`;
}
