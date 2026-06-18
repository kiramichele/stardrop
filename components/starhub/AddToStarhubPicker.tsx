"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  ClipboardList,
  Gamepad2,
  Save,
  Check,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Label,
  Select,
  Textarea,
  FieldHint,
  FieldError,
} from "@/components/ui/Input";
import type { PlaygroundProgram } from "@/lib/playground";
import type { CodeSubmissionForGist } from "@/lib/starhub-server";
import {
  createGistFromProgram,
  createGistFromSubmission,
  addShowcaseToStarhub,
} from "@/app/starhub/actions";

/** A showcase project the student already owns + can feature on StarHub. */
export type ShowcaseChoice = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
};

export function AddToStarhubPicker({
  username,
  programs,
  submissions,
  showcaseProjects,
}: {
  username: string;
  programs: PlaygroundProgram[];
  submissions: CodeSubmissionForGist[];
  showcaseProjects: ShowcaseChoice[];
}) {
  return (
    <div className="space-y-5 max-w-3xl">
      <PlaygroundSection username={username} programs={programs} />
      <SubmissionSection username={username} submissions={submissions} />
      <ShowcaseSection username={username} projects={showcaseProjects} />
    </div>
  );
}

// =============================================================
// Section: From a Playground program → gist
// =============================================================

function PlaygroundSection({
  username,
  programs,
}: {
  username: string;
  programs: PlaygroundProgram[];
}) {
  const router = useRouter();
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!programId) return;
    setError(null);
    start(async () => {
      const result = await createGistFromProgram({
        programId,
        description,
        isPublic,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/starhub/${username}`);
    });
  }

  return (
    <SectionShell
      icon={<Terminal className="w-5 h-5" strokeWidth={1.75} />}
      title="From the Playground"
      subtitle="Pick one of your saved programs to feature on StarHub as a gist."
    >
      {programs.length === 0 ? (
        <EmptyHint
          href="/playground"
          label="Open the Playground"
          message="You haven't saved any programs yet. Save one from the Playground first, then come back to add it."
        />
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="pg-pick">Saved program</Label>
            <Select
              id="pg-pick"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={pending}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.language})
                </option>
              ))}
            </Select>
          </div>
          <CaptionAndVisibility
            description={description}
            onDescription={setDescription}
            isPublic={isPublic}
            onIsPublic={setIsPublic}
            disabled={pending}
            idPrefix="pg"
          />
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={save} disabled={pending || !programId}>
            <Save className="w-4 h-4" strokeWidth={2} />
            {pending ? "Adding…" : "Add to StarHub"}
          </Button>
        </div>
      )}
    </SectionShell>
  );
}

// =============================================================
// Section: From a code-assignment submission → gist
// =============================================================

function SubmissionSection({
  username,
  submissions,
}: {
  username: string;
  submissions: CodeSubmissionForGist[];
}) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState(
    submissions[0]?.submissionId ?? ""
  );
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!submissionId) return;
    setError(null);
    start(async () => {
      const result = await createGistFromSubmission({
        submissionId,
        description,
        isPublic,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/starhub/${username}`);
    });
  }

  return (
    <SectionShell
      icon={<ClipboardList className="w-5 h-5" strokeWidth={1.75} />}
      title="From a code assignment"
      subtitle="Pick one of your submitted code assignments to share as a gist on StarHub."
    >
      {submissions.length === 0 ? (
        <EmptyHint
          href="/student/assignments"
          label="See assignments"
          message="No submitted code assignments yet. Once you turn one in, it'll show up here."
        />
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="sub-pick">Code assignment</Label>
            <Select
              id="sub-pick"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              disabled={pending}
            >
              {submissions.map((s) => (
                <option key={s.submissionId} value={s.submissionId}>
                  {s.assignmentTitle}
                </option>
              ))}
            </Select>
          </div>
          <CaptionAndVisibility
            description={description}
            onDescription={setDescription}
            isPublic={isPublic}
            onIsPublic={setIsPublic}
            disabled={pending}
            idPrefix="sub"
          />
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={save} disabled={pending || !submissionId}>
            <Save className="w-4 h-4" strokeWidth={2} />
            {pending ? "Adding…" : "Add to StarHub"}
          </Button>
        </div>
      )}
    </SectionShell>
  );
}

// =============================================================
// Section: From a Showcase project → flip its visibility
// =============================================================

function ShowcaseSection({
  username,
  projects,
}: {
  username: string;
  projects: ShowcaseChoice[];
}) {
  const router = useRouter();
  const eligible = projects.filter((p) => !p.isPublic);
  const [projectId, setProjectId] = useState(eligible[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (!projectId) return;
    setError(null);
    start(async () => {
      const result = await addShowcaseToStarhub(projectId);
      if (!result.ok) {
        setError(result.error ?? "Couldn't update.");
        return;
      }
      setDone(true);
      router.push(`/starhub/${username}`);
    });
  }

  return (
    <SectionShell
      icon={<Gamepad2 className="w-5 h-5" strokeWidth={1.75} />}
      title="From a Showcase project"
      subtitle="Make one of your published games visible on your StarHub."
    >
      {projects.length === 0 ? (
        <EmptyHint
          href="/showcase/new"
          label="Publish a project"
          message="You haven't published any Showcase projects yet."
        />
      ) : eligible.length === 0 ? (
        <p className="text-sm text-wood-600">
          All of your Showcase projects are already on your StarHub. ✨
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="sc-pick">Showcase project</Label>
            <Select
              id="sc-pick"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={pending}
            >
              {eligible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <FieldHint>
              This just flips the project to public — no caption to write.
              It&apos;ll appear on your StarHub right away.
            </FieldHint>
          </div>
          {error && <FieldError>{error}</FieldError>}
          {done && (
            <p className="flex items-center gap-1.5 text-sm text-sage-700">
              <Check className="w-3.5 h-3.5" />
              Added.
            </p>
          )}
          <Button onClick={save} disabled={pending || !projectId}>
            <Save className="w-4 h-4" strokeWidth={2} />
            {pending ? "Adding…" : "Add to StarHub"}
          </Button>
        </div>
      )}
    </SectionShell>
  );
}

// =============================================================
// Shared shells
// =============================================================

function SectionShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-terracotta-100 border border-terracotta-200 text-terracotta-700">
          {icon}
        </div>
        <div>
          <h3 className="font-display text-lg text-wood-900">{title}</h3>
          <p className="text-sm text-wood-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function CaptionAndVisibility({
  description,
  onDescription,
  isPublic,
  onIsPublic,
  disabled,
  idPrefix,
}: {
  description: string;
  onDescription: (v: string) => void;
  isPublic: boolean;
  onIsPublic: (v: boolean) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-cap`}>
          Caption{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id={`${idPrefix}-cap`}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="A line or two about what this is."
          rows={2}
          maxLength={600}
          disabled={disabled}
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => onIsPublic(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
        />
        <span>
          <span className="block text-sm font-medium text-wood-900">
            Publish on my StarHub now
          </span>
          <span className="block text-xs text-wood-500">
            Visible to classmates and your teacher. You can flip this any
            time later.
          </span>
        </span>
      </label>
    </>
  );
}

function EmptyHint({
  href,
  label,
  message,
}: {
  href: string;
  label: string;
  message: string;
}) {
  return (
    <div className="rounded-cozy border border-dashed border-wood-200 bg-cream-50 px-4 py-4 text-sm text-wood-600">
      <p className="mb-2">{message}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800"
      >
        {label} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

