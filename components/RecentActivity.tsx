"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Dumbbell, Flame, Heart, ThumbsUp } from "lucide-react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { displayName, relativeTime } from "@/lib/format";

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
  | { kind: "supporter"; at: number; supportType: string; name: string | null; image?: string | null; message?: string }
  | { kind: "message"; at: number; name: string | null; image?: string | null; supportType: string; body: string }
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
  unit,
  ownerName,
  ownerImage,
  limit = 8,
}: {
  goalId: Id<"goals">;
  unit?: string;
  ownerName?: string;
  ownerImage?: string | null;
  limit?: number;
}) {
  const supporters = useQuery(api.supporters.listForGoal, { goalId, limit: 8 });
  const messages = useQuery(api.supportMessages.listForGoal, { goalId });
  const reactions = useQuery(api.reactions.recentEmoji, { goalId, limit: 8 });
  const updates = useQuery(api.updates.listRecentForGoal, { goalId, limit });
  const profileIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...((supporters as any[]) ?? []).map((supporter) => supporter.userId),
            ...((messages as any[]) ?? []).map((message) => message.authorId),
          ].filter((id): id is Id<"users"> => Boolean(id))
        )
      ),
    [supporters, messages]
  );
  const profiles = useQuery(api.users.profilesById, profileIds.length > 0 ? { ids: profileIds } : "skip");

  const items: ActivityItem[] = useMemo(() => {
    const out: ActivityItem[] = [];

    for (const s of (supporters as any[]) ?? []) {
      out.push({
        kind: "supporter",
        at: s.createdAt,
        supportType: s.supportType,
        name: s.isAnonymous && !s.userId ? "Someone" : profiles?.[s.userId]?.name ?? null,
        image: s.isAnonymous && !s.userId ? null : profiles?.[s.userId]?.image ?? null,
      });
    }
    for (const m of (messages as any[]) ?? []) {
      out.push({
        kind: "message",
        at: m.createdAt,
        name: m.isAnonymous && !m.authorId ? "Someone" : profiles?.[m.authorId]?.name ?? null,
        image: m.isAnonymous && !m.authorId ? null : profiles?.[m.authorId]?.image ?? null,
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
      if (u.type === "value") {
        if (unit === "days") {
          body = `reached a ${u.value ?? ""} day streak`.trim();
        } else {
          const label = unit || "value";
          body = `reached ${u.value ?? ""} ${label}`.trim();
        }
      }
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
            <ActivityIcon item={it} ownerName={ownerName} ownerImage={ownerImage} />
            <div className="min-w-0 flex-1">
              <ActivityBody item={it} ownerName={ownerName} />
            </div>
            <time
              dateTime={new Date(it.at).toISOString()}
              className="shrink-0 text-[10px] text-[var(--color-text-dim)]"
            >
              {relativeTime(it.at)}
            </time>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function ActivityIcon({
  item,
  ownerName,
  ownerImage,
}: {
  item: ActivityItem;
  ownerName?: string;
  ownerImage?: string | null;
}) {
  if (item.kind === "update") {
    return <ActivityAvatar name={ownerName ?? "Owner"} image={ownerImage} />;
  }
  if (item.kind === "supporter" || item.kind === "message") {
    return <ActivityAvatar name={displayName(item.name)} image={item.image} />;
  }
  const Icon = (CHEER_META[item.emoji] ?? CHEER_META.thumbsup).icon;
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
      <Icon size={14} strokeWidth={1.8} aria-hidden />
    </span>
  );
}

function ActivityAvatar({ name, image }: { name: string; image?: string | null }) {
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={`${name}'s avatar`}
        className="mt-0.5 h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
      />
    );
  }
  return (
    <span
      aria-label={`${name}'s avatar`}
      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white bg-[var(--color-primary)] text-[10px] font-bold text-white shadow-sm"
    >
      {initials}
    </span>
  );
}

function ActivityBody({ item, ownerName }: { item: ActivityItem; ownerName?: string }) {
  if (item.kind === "supporter") {
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{displayName(item.name)}</span> joined
        with {SUPPORT_LABEL[item.supportType] ?? item.supportType}
      </p>
    );
  }
  if (item.kind === "message") {
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{displayName(item.name)}</span> sent{" "}
        {SUPPORT_LABEL[item.supportType] ?? "a note"}
        {item.body && <span className="text-[var(--color-text-muted)]"> — "{item.body.slice(0, 80)}{item.body.length > 80 ? "…" : ""}"</span>}
      </p>
    );
  }
  if (item.kind === "cheer") {
    const cheerLabel = (CHEER_META[item.emoji] ?? CHEER_META.thumbsup).label;
    return (
      <p className="text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{displayName(item.name)}</span> sent{" "}
        {cheerLabel}
      </p>
    );
  }
  // update
  return (
    <p className="text-[var(--color-text-secondary)]">
      <span className="font-medium text-[var(--color-text)]">{ownerName ?? "Owner"}</span> {item.body}
    </p>
  );
}
