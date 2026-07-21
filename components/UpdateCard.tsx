"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Link as LinkIcon, MessageSquare, TrendingUp } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "./CategoryIcon";
import { relativeTime } from "@/lib/format";

interface UpdateDoc {
  _id: Id<"updates">;
  type: "note" | "image" | "link" | "value";
  value?: number;
  note?: string;
  imageId?: Id<"_storage">;
  linkUrl?: string;
  linkTitle?: string;
  createdAt: number;
}

export function UpdateCard({
  update,
  imageUrl,
  unit,
  direction,
  index = 0,
}: {
  update: UpdateDoc;
  imageUrl?: string | null;
  unit: string;
  direction: "increase" | "decrease";
  index?: number;
}) {
  const arrow = direction === "decrease" ? "↓" : "↑";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
      className="relative"
    >
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5">
        <div className="mb-2.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <UpdateIcon type={update.type} />
          <span className="font-mono tabular-nums">{relativeTime(update.createdAt)}</span>
          {update.type === "value" && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-elev)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)]">
              <TrendingUp size={10} />
              {arrow} {update.value} {unit}
            </span>
          )}
        </div>

        {update.type === "image" && imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="mb-3 max-h-96 w-full rounded-xl object-cover"
            loading="lazy"
          />
        )}

        {update.type === "link" && update.linkUrl && (
          <a
            href={update.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm transition hover:border-[var(--color-accent)]"
          >
            <LinkIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            <span className="truncate font-medium">
              {update.linkTitle || update.linkUrl}
            </span>
            <span className="ml-auto text-xs text-[var(--color-text-dim)]">↗</span>
          </a>
        )}

        {update.note && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
            {update.note}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function UpdateIcon({ type }: { type: UpdateDoc["type"] }) {
  const Icon = {
    note: MessageSquare,
    image: ImageIcon,
    link: LinkIcon,
    value: TrendingUp,
  }[type];
  return <Icon size={12} className="text-[var(--color-text-dim)]" />;
}

export type { UpdateDoc };
