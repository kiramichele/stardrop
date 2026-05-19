// Client-safe: feedback thread types only.
// Server queries live in lib/feedback-server.ts.

export type FeedbackEntry = {
  /** Synthetic id for the initial message ("initial:<submissionId>"), real uuid for replies. */
  id: string;
  source: "initial" | "reply";
  authorRole: "teacher" | "student";
  authorFirstName: string;
  authorLastName: string;
  body: string;
  createdAt: string;
};
