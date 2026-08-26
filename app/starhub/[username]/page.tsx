import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getStudentIdentityByUsername,
  getPortfolioEntries,
} from "@/lib/starhub-server";
import { entryFilterBucket, resolvePortfolioTheme } from "@/lib/starhub";
import { IdentityHeader } from "@/components/starhub/IdentityHeader";
import {
  PortfolioFeed,
  type FeedItem,
} from "@/components/starhub/PortfolioFeed";
import { EntryCard } from "@/components/starhub/EntryCard";

export default async function StarHubProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();
  const identity = await getStudentIdentityByUsername(username);
  if (!identity) notFound();

  const isOwner = viewer.id === identity.id;
  const isTeacher = viewer.role === "teacher";
  const canSeePrivate = isOwner || isTeacher;
  const theme = resolvePortfolioTheme(identity.theme);

  const entries = await getPortfolioEntries(identity.id, {
    canSeePrivate,
  });

  // Pre-render each card on the server so shiki highlighting happens
  // once at request time — zero client-side highlight cost.
  const items: FeedItem[] = await Promise.all(
    entries.map(async (entry) => ({
      id: `${entry.kind}:${entry.id}`,
      bucket: entryFilterBucket(entry),
      node: (
        <EntryCard
          entry={entry}
          isOwner={isOwner}
          isTeacher={isTeacher}
          codeTheme={identity.codeTheme}
        />
      ),
    }))
  );

  return (
    <div className={`rounded-cozy-lg p-6 sm:p-8 ${theme.pageBgClass}`}>
      <IdentityHeader identity={identity} isOwner={isOwner} isTeacher={isTeacher} />
      <PortfolioFeed items={items} isOwner={isOwner} />
    </div>
  );
}
