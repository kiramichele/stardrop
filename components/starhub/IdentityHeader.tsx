import Link from "next/link";
import { Sparkles, Settings as SettingsIcon, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
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
}: {
  identity: StarHubIdentity;
  isOwner: boolean;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
      <Avatar
        firstName={identity.firstName}
        lastName={identity.lastName}
        avatarUrl={identity.avatarUrl}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl text-wood-900 leading-tight">
            {starHubDisplayName(identity)}
          </h1>
          <p className="text-sm text-wood-500 font-mono">
            @{identity.username}
          </p>
        </div>

        {identity.studio && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-terracotta-700">
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

        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/starhub/new">
              <Button size="sm">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                New gist
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
      </div>
    </header>
  );
}
