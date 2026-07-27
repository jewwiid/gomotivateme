"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Dumbbell, Flame, Heart, MessageCircle, Sparkles, ThumbsUp, TrendingUp, CheckCircle2, Image as ImageIcon, Images, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/lib/format";

const CHEER_META: Record<string, { icon: typeof ThumbsUp; label: string }> = {
  thumbsup: { icon: ThumbsUp, label: "a cheer" },
  muscle: { icon: Dumbbell, label: "a you-got-this" },
  heart: { icon: Heart, label: "some love" },
  fire: { icon: Flame, label: "an on-fire cheer" },
};

const SUPPORT_LABEL: Record<string, string> = {
  encourage: "encouragement",
  experience: "shared experience",
  advice: "practical advice",
  checkin: "a check-in",
  join: "to join the team",
};

type ActivityItem =
  | { kind: "supporter"; at: number; supportType: string; name: string | null; message?: string }
  | { kind: "message"; at: number; name: string | null; supportType: string; body: string }
  | { kind: "cheer"; at: number; emoji: string; name: string | null }
  | { kind: "update"; at: number; type: "value" | "milestone" | "note" | "image" | "media" | "link"; body: string };

/**
 * The time-anchored activity feed. Merges:
 *   - Recent supporters (joins)
 *   - Recent support messages
 *   - Recent cheers (emoji)
 *   - Recent progress updates
 * into a single time-anchored stream.
 */
export function RecentActivity({
  goalId,
  limit = 8,
}: {
  goalId: Id<"goals">;
  limit?: number;
}) {
  const supporters = useQuery(api.supporters.listForGoal, { goalId, limit: 8 });
  const messages = useQuery(api.supportMessages.listForGoal, { goalId });
  const reactions = useQuery(api.reactions.recentEmoji, { goalId, limit: 8 });
  const updates = useQuery(api.updates.listRecentForGoal, { goalId, limit });
  const profiles = useQuery(
    api.users.profilesById,
    supporters && supporters.length > 0
      ? { ids: Array.from(new Set(supporters.map((s: any) => s.userId))) }
      : "skip"
  );

  const items: ActivityItem[] = useMemo(() => {
    const out: ActivityItem[] = [];

    for (const s of (supporters as any[]) ?? []) {
      out.push({
        kind: "supporter",
        at: s.createdAt,
        supportType: s.supportType,
        name: profiles?.[s.userId]?.name ?? null,
      });
    }
    for (const m of (messages as any[]) ?? []) {
      out.push({
        kind: "message",
        at: m.createdAt,
        name: profiles?.[m.authorId]?.name ?? null,
        supportType: m.supportType,
        body: m.body,
      });
    }
    for (const r of (reactions as any[]) ?? []) {
      out.push({
        kind: "cheer",
        at: r.createdAt,
        emoji: r.emoji ?? "thumbsup",
        name: r.displayName ?? null,
      });
    }
    for (const u of (updates as any[]) ?? []) {
      let body = "";
      if (u.type === "value") body = `logged a value${u.value ? ` (${u.value})` : ""}`;
      else if (u.type === "milestone") body = "ticked a milestone";
      else if (u.type === "note") body = u.note ? `"${u.note.slice(0, 80)}"` : "shared a note";
      else if (u.type === "image") body = "shared a photo";
      else if (u.type === "media") body = "shared progress media";
      else if (u.type === "link") body = u.linkTitle || u.linkUrl || "shared a link";
      out.push({ kind: "update", at: u.createdAt, type: u.type, body });
    }

    out.sort((a, b) => b.at - a.at);
    return out.slice(0, limit);
  }, [supporters, messages, reactions, updates, profiles, limit]);

  if (items.length === 0) {
    return (
      <section className="workspace-card p-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Recent activity</h2>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Nothing yet. Be the first to show up.
        </p>
      </section>
    );
  }

  return (
    <section className="workspace-card p-6">
      <h2 className="text-base font-semibold text-[var(--color-text)]">Recent activity</h2>
      <ul className="mt-4 space-y-3">
        {items.map((it, i) => (
          <motion.li
            key={`${it.kind}-${it.at}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
            className="flex items-start gap-3 text-sm"
          >
            <ActivityIcon item={it} />
            <div className="min-w-0 flex-1">
              <ActivityBody item={it} />
            </div>
            <Link
              href="#"
              className="shrink-0 text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]"
            >
              {relativeTime(it.at)}
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function ActivityIcon({ item }: { item: ActivityItem }) {
  if (item.kind === "supporter") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Sparkles size={13} />
      </span>
    );
  }
  if (item.kind === "message") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <MessageCircle size={13} />
      </span>
    );
  }
  if (item.kind === "cheer") {
    const Icon = (CHEER_META[item.emoji] ?? CHEER_META.thumbsup).icon;
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon size={13} strokeWidth={1.8} aria-hidden />
      </span>
    );
  }
  // update
  if (item.type === "value") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
        <TrendingUp size={13} />
      </span>
    );
  }
  if (item.type === "milestone") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
        <CheckCircle2 size={13} />
      </span>
    );
  }
  if (item.type === "image") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)]">
        <ImageIcon size={13} />
      </span>
    );
  }
  if (item.type === "media") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)]">
        <Images size={13} />
      </span>
    );
  }
  if (item.type === "link") {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)]">
        <LinkIcon size={13} />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)]">
      <Heart size={13} />
    </span>
  );
}

function ActivityBody({ item }: { item: ActivityItem }) {
  if (item.kind === "supporter") {
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{item.name ?? "Someone"}</span> joined
        with {SUPPORT_LABEL[item.supportType] ?? item.supportType}
      </p>
    );
  }
  if (item.kind === "message") {
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{item.name ?? "Someone"}</span> sent{" "}
        {SUPPORT_LABEL[item.supportType] ?? "a note"}
        {item.body && <span className="text-[var(--color-text-muted)]"> — "{item.body.slice(0, 80)}{item.body.length > 80 ? "…" : ""}"</span>}
      </p>
    );
  }
  if (item.kind === "cheer") {
    const cheerLabel = (CHEER_META[item.emoji] ?? CHEER_META.thumbsup).label;
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{item.name ?? "Someone"}</span> sent{" "}
        {cheerLabel}
      </p>
    );
  }
  // update
  return (
    <p className="text-[var(--color-text-secondary)]">
      <span className="font-medium text-[var(--color-text)]">You</span> {item.body}
    </p>
  );
}
