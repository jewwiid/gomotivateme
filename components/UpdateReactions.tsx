"use client";

import { useQuery, useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useVisitorKey } from "@/lib/useVisitorKey";

const EMOJIS: { kind: "thumbsup" | "muscle" | "heart" | "fire"; glyph: string }[] = [
  { kind: "thumbsup", glyph: "👍" },
  { kind: "muscle", glyph: "💪" },
  { kind: "heart", glyph: "❤️" },
  { kind: "fire", glyph: "🔥" },
];

/**
 * Compact inline reaction bar for a single timeline update.
 * Same 4 emojis as the goal-level ReactionBar, same toggle behavior,
 * but smaller — no heading, just emoji buttons + counts in a row.
 */
export function UpdateReactions({
  updateId,
  goalId,
}: {
  updateId: Id<"updates">;
  goalId: Id<"goals">;
}) {
  const visitorKey = useVisitorKey();
  const stats = useQuery(api.reactions.updateStats, { updateId });
  const myEmoji = useQuery(
    api.reactions.visitorUpdateEmoji,
    visitorKey ? { updateId, visitorKey } : "skip"
  );
  const setEmoji = useMutation(api.reactions.setUpdateEmoji);

  const counts = stats?.emojiCounts ?? { thumbsup: 0, muscle: 0, heart: 0, fire: 0 };
  const total = stats?.emojiTotal ?? 0;

  const onReact = (emoji: "thumbsup" | "muscle" | "heart" | "fire") => {
    if (!visitorKey) return;
    void setEmoji({ updateId, goalId, visitorKey, emoji });
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      {EMOJIS.map(({ kind, glyph }) => {
        const count = counts[kind] ?? 0;
        const active = myEmoji === kind;
        return (
          <button
            key={kind}
            onClick={() => onReact(kind)}
            disabled={!visitorKey}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition disabled:opacity-40 ${
              active
                ? "bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)]/30"
                : "hover:bg-zinc-100"
            }`}
            aria-label={`React with ${glyph}`}
            aria-pressed={active}
          >
            <span className="text-sm leading-none">{glyph}</span>
            {count > 0 && (
              <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                {count}
              </span>
            )}
          </button>
        );
      })}
      {total > 0 && (
        <span className="ml-1 text-[10px] text-zinc-400">
          {total} {total === 1 ? "cheer" : "cheers"}
        </span>
      )}
    </div>
  );
}
