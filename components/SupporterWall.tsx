"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/lib/format";

const SUPPORT_GLYPH: Record<string, string> = {
  encourage: "💛",
  experience: "✨",
  advice: "💡",
  checkin: "📆",
  join: "🤝",
};

const SUPPORT_LABEL: Record<string, string> = {
  encourage: "Encouragement",
  experience: "Shares experience",
  advice: "Practical advice",
  checkin: "Checks in",
  join: "Joined the challenge",
};

export function SupporterWall({ goalId }: { goalId: Id<"goals"> }) {
  const supporters = useQuery(api.supporters.listForGoal, { goalId, limit: 50 });
  const messages = useQuery(api.supportMessages.listForGoal, { goalId });
  const profiles = useQuery(
    api.users.profilesById,
    supporters && supporters.length > 0
      ? { ids: Array.from(new Set(supporters.map((s: any) => s.userId))) }
      : "skip"
  );

  // Build a map of userId -> latest support message
  const messagesByUser = useMemo(() => {
    const map = new Map<string, { body: string; createdAt: number }>();
    for (const m of messages ?? []) {
      const existing = map.get(m.authorId);
      if (!existing || m.createdAt > existing.createdAt) {
        map.set(m.authorId, { body: m.body, createdAt: m.createdAt });
      }
    }
    return map;
  }, [messages]);

  if (!supporters || supporters.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        <Users size={14} className="text-[var(--color-accent)]" />
        Supporters ({supporters.length})
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {supporters.map((s: any, i: number) => {
          const profile = profiles?.[s.userId];
          const name = profile?.name ?? "Someone";
          const initial = name[0]?.toUpperCase() ?? "?";
          const message = messagesByUser.get(s.userId);
          return (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
            >
              <div className="flex items-center gap-3">
                {profile?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt=""
                    className="h-8 w-8 rounded-full border border-[var(--color-border)] object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold)] text-sm font-semibold text-black">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {name}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-dim)]">
                    <span>{SUPPORT_GLYPH[s.supportType] ?? "💛"}</span>
                    <span>{SUPPORT_LABEL[s.supportType] ?? s.supportType}</span>
                    <span>·</span>
                    <span>{relativeTime(s.createdAt)}</span>
                  </div>
                </div>
              </div>

              {s.pledge && (
                <div className="mt-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2.5 text-xs italic text-[var(--color-text)]">
                  <Sparkles size={10} className="mr-1 inline" />
                  "{s.pledge}"
                </div>
              )}

              {message && (
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text)]">
                  {message.body}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
