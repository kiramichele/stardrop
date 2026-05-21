"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileArchive,
  Link2,
  Star,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  assetKind,
  assetHref,
  assetPreviewUrl,
  isImageAsset,
  isAudioAsset,
  linkDomain,
  categoryLabel,
  contributorName,
  formatBytes,
  type AssetView,
} from "@/lib/assets";
import { deleteAsset } from "@/app/assets/actions";

export function AssetCard({
  asset,
  isTeacher,
  currentUserId,
}: {
  asset: AssetView;
  isTeacher: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const kind = assetKind(asset);
  const href = assetHref(asset);
  const previewUrl = assetPreviewUrl(asset);
  const isImage = isImageAsset(asset);
  const isAudio = isAudioAsset(asset);
  const curated = asset.contributor.role === "teacher";
  const canDelete = isTeacher || asset.contributor.id === currentUserId;

  function remove() {
    setError(null);
    start(async () => {
      const result = await deleteAsset(asset.id);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Couldn't delete.");
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-cozy-lg border border-wood-100/70 bg-cream-50 shadow-cozy">
      {/* Preview */}
      {isImage && previewUrl ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="block aspect-[16/9] bg-cream-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        </a>
      ) : isAudio && previewUrl ? (
        <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-sage-100 to-honey-100 px-4">
          <audio controls src={previewUrl} className="w-full" />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-terracotta-100 to-honey-100">
          {kind === "file" ? (
            <FileArchive
              className="h-9 w-9 text-terracotta-400"
              strokeWidth={1.5}
            />
          ) : (
            <Link2 className="h-9 w-9 text-terracotta-400" strokeWidth={1.5} />
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-wood-200 bg-cream-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label text-wood-600">
            {categoryLabel(asset.category)}
          </span>
          {curated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-honey-200 bg-honey-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label text-honey-700">
              <Star className="h-2.5 w-2.5 fill-current" />
              Curated
            </span>
          )}
        </div>

        <h3 className="mt-1.5 font-display text-lg leading-tight text-wood-900">
          {asset.title}
        </h3>

        {asset.description && (
          <p className="mt-1 line-clamp-2 flex-1 text-sm text-wood-600">
            {asset.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-cozy bg-terracotta-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-600"
          >
            {kind === "file" ? (
              <>
                <Download className="h-3.5 w-3.5" />
                Download
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </>
            )}
          </a>
          <span className="text-xs text-wood-400">
            {kind === "file"
              ? asset.file_size
                ? formatBytes(asset.file_size)
                : "File"
              : linkDomain(asset.url ?? "")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-wood-100 pt-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar
              firstName={asset.contributor.firstName}
              lastName={asset.contributor.lastName}
              avatarUrl={asset.contributor.avatarUrl}
              size="sm"
            />
            <span className="truncate text-xs text-wood-500">
              {contributorName(asset.contributor)}
            </span>
          </div>

          {canDelete &&
            (confirming ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="text-xs font-medium text-terracotta-700 hover:text-terracotta-800 disabled:opacity-50"
                >
                  {pending ? "Removing…" : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="text-xs text-wood-500 hover:text-wood-700"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1 text-xs text-wood-400 transition-colors hover:text-terracotta-700"
                aria-label="Remove asset"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ))}
        </div>

        {error && (
          <p className="mt-2 text-xs text-terracotta-800">{error}</p>
        )}
      </div>
    </div>
  );
}
