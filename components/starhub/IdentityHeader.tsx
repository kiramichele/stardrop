import Link from "next/link";
import {
  Sparkles,
  Settings as SettingsIcon,
  Plus,
  ImagePlus,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PortfolioShareToggle } from "@/components/starhub/PortfolioShareToggle";
import { PortfolioCustomizer } from "@/components/starhub/PortfolioCustomizer";
import { SocialLinksRow } from "@/components/starhub/SocialLinksRow";
import { TeacherShareLink } from "@/components/starhub/TeacherShareLink";
import {
  resolvePortfolioTheme,
  starHubDisplayName,
  type StarHubIdentity,
} from "@/lib/starhub";

/**
 * GitHub-style identity header for the StarHub. Avatar + name +
 * studio/role chip + bio + owner-only quick actions.
 */
export function IdentityHeader({
  identity,
  isOwner,
  isTeacher = false,
}: {
  identity: StarHubIdentity;
  isOwner: boolean;
  isTeacher?: boolean;
}) {
  const theme = resolvePortfolioTheme(identity.theme);

  return (
    <header className="mb-8">
      {identity.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.bannerUrl}
          alt=""
          className="mb-5 h-32 w-full rounded-cozy-lg object-cover sm:h-40"
        />
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar
          firstName={identity.firstName}
          lastName={identity.lastName}
          avatarUrl={identity.avatarUrl}
          size="lg"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1
              className={`font-display text-3xl leading-tight ${theme.accentTextClass}`}
            >
              {starHubDisplayName(identity)}
            </h1>
            <p className="text-sm text-wood-500 font-mono">
              @{identity.username}
            </p>
          </div>

          {identity.studio && (
            <p
              className={`mt-1 inline-flex items-center gap-1.5 text-sm ${theme.accentTextClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="font-medium">{identity.studio}</span>
            </p>
          )}

          {identity.bio ? (
            <p className="mt-3 max-w-prose text-wood-700 whitespace-pre-wrap leading-relaxed">
              {identity.bio}
            </p>
          ) : isOwner ? (
            <p className="mt-3 text-sm text-wood-400 italic">
              No bio yet — add one from your profile settings.
            </p>
          ) : null}

          <SocialLinksRow links={identity.links} />

          {isOwner && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href="/starhub/post">
                <Button size="sm">
                  <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} />
                  New post
                </Button>
              </Link>
              <Link href="/starhub/new">
                <Button size="sm" variant="secondary">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  Add work
                </Button>
              </Link>
              <Link href="/profile">
                <Button size="sm" variant="ghost">
                  <SettingsIcon className="w-3.5 h-3.5" strokeWidth={2} />
                  Edit profile
                </Button>
              </Link>
            </div>
          )}

          {isOwner && (
            <>
              <PortfolioShareToggle
                username={identity.username}
                initialPublic={identity.portfolioPublic}
              />
              <PortfolioCustomizer
                theme={theme.id}
                codeTheme={identity.codeTheme}
                bannerUrl={identity.bannerUrl}
                links={identity.links}
              />
            </>
          )}

          {!isOwner && isTeacher && identity.portfolioPublic && (
            <TeacherShareLink username={identity.username} />
          )}
        </div>
      </div>
    </header>
  );
}
