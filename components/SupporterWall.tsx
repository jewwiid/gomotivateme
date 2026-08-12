"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { displayName, relativeTime } from "@/lib/format";

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

  // Group all support messages by author (sorted oldest → newest as returned).
  const messagesByUser = useMemo(() => {
    const map = new Map<string, Array<{ body: string; createdAt: number }>>();
    for (const m of messages ?? []) {
      const arr = map.get(m.authorId) ?? [];
      arr.push({ body: m.body, createdAt: m.createdAt });
      map.set(m.authorId, arr);
    }
    return map;
  }, [messages]);

  if (!supporters || supporters.length === 0) return null;

  return (
    <section className="mt-3 rounded-[1.75rem] bg-[var(--color-bg-elev)] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-primary)]">People beside this goal</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">Supporters</h2>
        </div>
        <span className="grid h-9 min-w-9 place-items-center rounded-full bg-[var(--color-primary-soft)] px-2 text-sm font-bold text-[var(--color-primary)]">
          {supporters.length}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {supporters.map((s: any, i: number) => {
          const profile = profiles?.[s.userId];
          const name = profile?.name ?? "Someone";
          const initial = name[0]?.toUpperCase() ?? "?";
          const userMessages = messagesByUser.get(s.userId) ?? [];
          return (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
              className="rounded-[1.25rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center gap-3">
                {profile?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt={`${displayName(name)}'s avatar`}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div aria-label={`${displayName(name)}'s avatar`} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] text-sm font-semibold text-white shadow-sm">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {displayName(name)}
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
                <div className="mt-3 rounded-xl bg-[var(--color-bg-elev)] p-3 text-xs italic leading-5 text-[var(--color-text)]">
                  <Sparkles size={10} className="mr-1 inline" />
                  "{s.pledge}"
                </div>
              )}

              {userMessages.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  {userMessages.map((m, mi) => (
                    <div key={mi} className="text-sm leading-relaxed text-[var(--color-text)]">
                      <p>{m.body}</p>
                      <div className="mt-0.5 text-[10px] text-[var(--color-text-dim)]">
                        {relativeTime(m.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
