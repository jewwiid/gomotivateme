"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";

/**
 * Rich link preview card — shows OG image, title, description, and site name.
 * Falls back to a simple text link when no preview data is available.
 */
export function LinkPreviewCard({
  url,
  title,
  description,
  siteName,
  imageUrl,
  embedded = false,
  compact = false,
}: {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  imageUrl?: string | null;
  /** When true, removes the outer card border (for use inside UpdateCard/workspace-card). */
  embedded?: boolean;
  /** A horizontal thumbnail treatment for dense journals and activity feeds. */
  compact?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayTitle = title || url;
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();
  const resolvedImage = imageUrl && !imageFailed ? imageUrl : null;

  if (compact || !resolvedImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group grid overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition hover:border-[var(--color-primary)] hover:shadow-sm ${
          compact ? "grid-cols-[5.5rem_minmax(0,1fr)]" : "grid-cols-[6.5rem_minmax(0,1fr)]"
        }`}
      >
        <PreviewVisual
          imageUrl={resolvedImage}
          title={displayTitle}
          domain={domain}
          onImageError={() => setImageFailed(true)}
        />
        <span className="flex min-w-0 items-center gap-3 p-3">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text)]">
              {displayTitle}
            </span>
            {description ? (
              <span className="mt-1 line-clamp-1 text-xs text-[var(--color-text-muted)]">
                {description}
              </span>
            ) : null}
            <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-dim)]">
              {siteName || domain}
            </span>
          </span>
          <ExternalLink size={13} className="shrink-0 text-[var(--color-text-dim)] transition group-hover:text-[var(--color-primary)]" />
        </span>
      </a>
    );
  }

  // Rich preview card with image.
  const cardClass = embedded
    ? "group block overflow-hidden rounded-xl transition hover:opacity-90"
    : "group block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition hover:border-[var(--color-border-strong)] hover:shadow-md";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClass}
    >
      {/* OG Image */}
      <div className={`relative aspect-[1.91/1] overflow-hidden ${embedded ? "rounded-lg" : ""} bg-[var(--color-bg-elev)]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedImage}
          alt={displayTitle}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
      {/* Text content */}
      <div className={embedded ? "pt-2" : "p-3"}>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text)]">
          {displayTitle}
        </p>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
        <p className="mt-1.5 text-[11px] text-[var(--color-text-dim)]">
          {siteName || domain}
        </p>
      </div>
    </a>
  );
}

function PreviewVisual({
  imageUrl,
  title,
  domain,
  onImageError,
}: {
  imageUrl: string | null;
  title: string;
  domain: string;
  onImageError: () => void;
}) {
  if (imageUrl) {
    return (
      <span className="block min-h-[5.5rem] overflow-hidden bg-[var(--color-bg-elev)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={onImageError}
        />
      </span>
    );
  }

  return (
    <span
      className="relative grid min-h-[5.5rem] place-items-center overflow-hidden bg-[var(--color-primary)] text-white"
      aria-label={`Preview for ${title}`}
    >
      <span className="absolute -right-5 -top-6 h-16 w-16 rounded-full bg-[var(--color-gold)]" aria-hidden />
      <Link2 size={22} strokeWidth={1.7} className="relative" aria-hidden />
      <span className="absolute inset-x-2 bottom-2 truncate text-center font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-white/80">
        {domain}
      </span>
    </span>
  );
}
