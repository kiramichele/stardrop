import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cache } from "react";
import {
  getStudentIdentityByUsername,
  getPortfolioEntries,
} from "@/lib/starhub-server";
import {
  entryFilterBucket,
  resolvePortfolioTheme,
  starHubDisplayName,
} from "@/lib/starhub";
import { Avatar } from "@/components/ui/Avatar";
import {
  PortfolioFeed,
  type FeedItem,
} from "@/components/starhub/PortfolioFeed";
import { EntryCard } from "@/components/starhub/EntryCard";
import { SocialLinksRow } from "@/components/starhub/SocialLinksRow";

// Public, no-login portfolio view — the link a student shares outside
// Stardrop (colleges, employers). Only reachable once the student has
// opted in via the "Public share link" toggle on their StarHub page;
// everyone else 404s, same as a nonexistent username, so the toggle
// state is never leaked. Deliberately no app chrome (sidebar/nav) — this
// is meant to stand alone as something you'd hand someone outside class.

const getPublicIdentity = cache(getStudentIdentityByUsername);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const identity = await getPublicIdentity(username);
  const name =
    identity && identity.portfolioPublic ? starHubDisplayName(identity) : null;
  return {
    title: name ? `${name} · Stardrop Portfolio` : "Portfolio · Stardrop",
    description: name
      ? (identity?.bio ?? `${name}'s public work from Stardrop.`)
      : undefined,
    // Direct-link sharing only — never crawled/indexed. These are minors'
    // names and work; opting into a share link isn't opting into Google.
    robots: { index: false, follow: false },
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const identity = await getPublicIdentity(username);
  if (!identity || !identity.portfolioPublic) notFound();

  const theme = resolvePortfolioTheme(identity.theme);

  const entries = await getPortfolioEntries(identity.id, {
    canSeePrivate: false,
  });
  const items: FeedItem[] = await Promise.all(
    entries.map(async (entry) => ({
      id: `${entry.kind}:${entry.id}`,
      bucket: entryFilterBucket(entry),
      node: (
        <EntryCard
          entry={entry}
          isOwner={false}
          isTeacher={false}
          codeTheme={identity.codeTheme}
        />
      ),
    }))
  );

  return (
    <div className={`min-h-screen flex flex-col ${theme.pageBgClass}`}>
      <header className="border-b border-wood-100 bg-cream-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-baseline gap-2">
          <span className="font-display text-lg text-terracotta-700 leading-none">
            Stardrop
          </span>
          <span className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold">
            Portfolio
          </span>
        </div>
      </header>

      {identity.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.bannerUrl}
          alt=""
          className="h-40 w-full object-cover sm:h-56"
        />
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            firstName={identity.firstName}
            lastName={identity.lastName}
            avatarUrl={identity.avatarUrl}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h1
              className={`font-display text-3xl leading-tight ${theme.accentTextClass}`}
            >
              {starHubDisplayName(identity)}
            </h1>
            {identity.studio && (
              <p
                className={`mt-1 inline-flex items-center gap-1.5 text-sm ${theme.accentTextClass}`}
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="font-medium">{identity.studio}</span>
              </p>
            )}
            {identity.bio && (
              <p className="mt-3 max-w-prose text-wood-700 whitespace-pre-wrap leading-relaxed">
                {identity.bio}
              </p>
            )}
            <SocialLinksRow links={identity.links} />
          </div>
        </header>

        <PortfolioFeed items={items} isOwner={false} />
      </main>
    </div>
  );
}
