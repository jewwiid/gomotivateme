"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/lib/format";

const EMOJI_GLYPH: Record<string, string> = {
  thumbsup: "👍",
  muscle: "💪",
  heart: "❤️",
  fire: "🔥",
};

export function RecentCheerers({ goalId }: { goalId: Id<"goals"> }) {
  const recent = useQuery(api.reactions.recentEmoji, { goalId, limit: 24 });

  if (!recent || recent.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        <Sparkles size={14} className="text-[var(--color-accent)]" />
        Recent cheerers
      </h2>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {recent.map((r: any, i: number) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2.5 py-2"
            >
              <span className="text-xl leading-none" aria-hidden>
                {r.emoji ? EMOJI_GLYPH[r.emoji] : "👍"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-[var(--color-text)]">
                  {r.displayName || "Anonymous"}
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)]">
                  {relativeTime(r.createdAt)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
