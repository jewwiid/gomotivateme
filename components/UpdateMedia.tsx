"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Play } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export type UpdateMediaItem = {
  kind: "image" | "embed";
  storageId?: Id<"_storage">;
  thumbnailId?: Id<"_storage">;
  provider?: "youtube" | "tiktok" | "instagram";
  canonicalUrl?: string;
  embedUrl?: string;
  providerId?: string;
  alt?: string;
};

export function UpdateMedia({
  media,
  imageUrlOf,
}: {
  media?: UpdateMediaItem[];
  imageUrlOf?: (imageId: Id<"_storage">) => string | null;
}) {
  if (!media?.length) return null;

  const images = media.filter(
    (item): item is UpdateMediaItem & { kind: "image"; storageId: Id<"_storage"> } =>
      item.kind === "image" && !!item.storageId
  );
  const embeds = media.filter(
    (item): item is UpdateMediaItem & { kind: "embed"; canonicalUrl: string } =>
      item.kind === "embed" && !!item.canonicalUrl
  );

  return (
    <div className="mb-3 space-y-3">
      {images.length > 0 && (
        <div className={images.length === 1 ? "" : "grid grid-cols-2 gap-2"}>
          {images.map((image) => {
            const displaySrc = imageUrlOf?.(image.storageId);
            const thumbnailSrc = image.thumbnailId ? imageUrlOf?.(image.thumbnailId) : null;
            const src = thumbnailSrc ?? displaySrc;
            if (!src) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.storageId}
                src={src}
                srcSet={
                  thumbnailSrc && displaySrc
                    ? `${thumbnailSrc} 640w, ${displaySrc} 1920w`
                    : undefined
                }
                sizes={
                  images.length === 1
                    ? "(max-width: 768px) 100vw, 720px"
                    : "(max-width: 768px) 50vw, 360px"
                }
                alt={image.alt ?? "Progress update photo"}
                className={
                  images.length === 1
                    ? "max-h-[32rem] w-full rounded-xl object-cover"
                    : "aspect-square w-full rounded-xl object-cover"
                }
                loading="lazy"
              />
            );
          })}
        </div>
      )}

      {embeds.map((embed) => (
        <PublicEmbed key={`${embed.provider}-${embed.providerId ?? embed.canonicalUrl}`} embed={embed} />
      ))}
    </div>
  );
}

function PublicEmbed({ embed }: { embed: UpdateMediaItem & { canonicalUrl: string } }) {
  const [loaded, setLoaded] = useState(false);

  if (!embed.provider) return <PublicLink embed={embed} />;
  if (!loaded) {
    const providerName = `${embed.provider[0].toUpperCase()}${embed.provider.slice(1)}`;
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="group flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-700 transition hover:border-zinc-300 hover:from-zinc-50 hover:to-zinc-100"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-white text-zinc-800 shadow-sm transition group-hover:scale-105">
          <Play size={18} fill="currentColor" />
        </span>
        <span className="text-sm font-semibold">Play {providerName} video</span>
        <span className="text-xs text-zinc-500">Loads from {providerName} when played</span>
      </button>
    );
  }

  if (embed.provider === "youtube" || embed.provider === "tiktok") {
    if (!embed.embedUrl) return <PublicLink embed={embed} />;
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        <iframe
          src={embed.embedUrl}
          title={`${embed.provider === "youtube" ? "YouTube" : "TikTok"} progress update`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (embed.provider === "instagram") {
    return <InstagramEmbed permalink={embed.canonicalUrl} />;
  }

  return <PublicLink embed={embed} />;
}

function InstagramEmbed({ permalink }: { permalink: string }) {
  useEffect(() => {
    const processEmbeds = () => {
      const instagram = (window as Window & {
        instgrm?: { Embeds?: { process: () => void } };
      }).instgrm;
      instagram?.Embeds?.process();
    };

    const existing = document.getElementById("instagram-embed-script") as HTMLScriptElement | null;
    if (existing) {
      processEmbeds();
      return;
    }

    const script = document.createElement("script");
    script.id = "instagram-embed-script";
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    script.onload = processEmbeds;
    document.body.appendChild(script);
  }, [permalink]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-2">
      <blockquote
        className="instagram-media !m-0 !min-w-0 !w-full"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
      >
        <a href={permalink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-700">
          View this Instagram post
        </a>
      </blockquote>
    </div>
  );
}

function PublicLink({ embed }: { embed: UpdateMediaItem & { canonicalUrl: string } }) {
  return (
    <a
      href={embed.canonicalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700 transition hover:border-zinc-300"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm">
        {embed.provider ? <Play size={14} /> : <ImageIcon size={14} />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {embed.provider ? `${embed.provider[0].toUpperCase()}${embed.provider.slice(1)} video` : "View shared media"}
      </span>
      <ExternalLink size={14} className="shrink-0 text-zinc-400" />
    </a>
  );
}
