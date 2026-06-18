// Client-safe: StarHub types, kind labels, and pure helpers.
// Server-only queries live in lib/starhub-server.ts; code highlighting
// lives in lib/code-highlight.ts (server-only, depends on shiki).

import type { SubmissionMedia } from "@/lib/assignments";

/** Public identity slice for the StarHub header + entry attribution. */
export type StarHubIdentity = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  studio: string | null;
};

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
    };

/** Category filters on the portfolio feed. */
export type PortfolioFilter = "all" | "code" | "video" | "writing" | "gist" | "showcase";

export const PORTFOLIO_FILTERS: { key: PortfolioFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "code", label: "Code" },
  { key: "video", label: "Videos" },
  { key: "writing", label: "Writing" },
  { key: "gist", label: "Gists" },
  { key: "showcase", label: "Showcase" },
];

/** Which filter bucket an entry falls into. */
export function entryFilterBucket(entry: PortfolioEntry): PortfolioFilter {
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

/** Languages students can pick when composing a gist. */
export const GIST_LANGUAGES: { key: string; label: string }[] = [
  { key: "csharp", label: "C# (Unity)" },
  { key: "javascript", label: "JavaScript" },
  { key: "typescript", label: "TypeScript" },
  { key: "python", label: "Python" },
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "json", label: "JSON" },
  { key: "shader", label: "Shader (HLSL)" },
  { key: "plaintext", label: "Plain text" },
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
