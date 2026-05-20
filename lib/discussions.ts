// Client-safe: discussion types + content-scanning helpers.

export type DiscussionAttachment = {
  id: string;
  kind: "image" | "video";
  storagePath: string;
  mime: string;
  size: number;
};

export type DiscussionBoard = {
  id: string;
  classId: string;
  className: string | null;
  title: string;
  description: string | null;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string | null;
  threadCount: number;
};

export type BoardAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "teacher" | "student";
};

export type BoardPost = {
  id: string;
  boardId: string;
  parentId: string | null;
  body: string;
  isPinned: boolean;
  flagged: boolean;
  flaggedTerms: string[];
  attachments: DiscussionAttachment[];
  createdAt: string | null;
  deleted: boolean;
  author: BoardAuthor | null;
  replyCount: number;
};

/** Narrow the JSONB attachments column into a typed array. */
export function parseAttachments(value: unknown): DiscussionAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is DiscussionAttachment =>
      !!a &&
      typeof a === "object" &&
      typeof (a as DiscussionAttachment).id === "string" &&
      typeof (a as DiscussionAttachment).storagePath === "string"
  );
}

/** Extract @username mentions. Usernames are lowercase alphanumeric. */
export function parseMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/@([a-zA-Z0-9]+)/g)) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

// Profanity filter — flags posts for teacher review (never blocks).
// Edit this list to tune what gets flagged.
const PROFANITY = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "cock",
  "pussy",
  "slut",
  "whore",
  "cunt",
  "fag",
  "faggot",
  "retard",
  "nigger",
  "nigga",
];

/** Returns the flagged terms found in `text` (empty array = clean). */
export function scanProfanity(text: string): string[] {
  const found = new Set<string>();
  for (const word of PROFANITY) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) found.add(word);
  }
  return [...found];
}
