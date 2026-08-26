import { GitFork, Gamepad2, Briefcase, Globe } from "lucide-react";
import { PORTFOLIO_LINK_TYPES, type PortfolioLink } from "@/lib/starhub";

// lucide-react dropped brand-mark icons a while back — these are generic
// stand-ins (git-fork for GitHub, briefcase for LinkedIn) rather than the
// real logos.
const ICONS: Record<PortfolioLink["type"], typeof GitFork> = {
  github: GitFork,
  itch: Gamepad2,
  linkedin: Briefcase,
  website: Globe,
};

/** Row of icon links under the bio — only renders links that are set. */
export function SocialLinksRow({ links }: { links: PortfolioLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {links.map((link) => {
        const Icon = ICONS[link.type];
        const label =
          PORTFOLIO_LINK_TYPES.find((t) => t.type === link.type)?.label ??
          link.type;
        return (
          <a
            key={link.type}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            title={label}
            className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors"
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{label}</span>
          </a>
        );
      })}
    </div>
  );
}
