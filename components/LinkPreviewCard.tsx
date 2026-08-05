"use client";

import { ExternalLink } from "lucide-react";

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
}: {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  imageUrl?: string | null;
}) {
  const displayTitle = title || url;
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  // No image → simple text link (same as before).
  if (!imageUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        {displayTitle}
        <ExternalLink size={12} className="shrink-0 opacity-60" />
      </a>
    );
  }

  // Rich preview card with image.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition hover:border-[var(--color-border-strong)] hover:shadow-md"
    >
      {/* OG Image */}
      <div className="relative aspect-[1.91/1] overflow-hidden bg-[var(--color-bg-elev)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={displayTitle}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          onError={(e) => {
            // If the image fails to load, hide it and fall back to text.
            (e.currentTarget.parentElement?.parentElement as HTMLElement).style.display = "none";
          }}
        />
      </div>
      {/* Text content */}
      <div className="p-3">
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
