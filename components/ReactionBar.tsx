"use client";

import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useVisitorKey } from "@/lib/useVisitorKey";
import { useCurrentUser } from "@/lib/useCurrentUser";

const EMOJIS: Array<{ key: "thumbsup" | "muscle" | "heart" | "fire"; glyph: string; label: string }> = [
  { key: "thumbsup", glyph: "👍", label: "Cheer" },
  { key: "muscle", glyph: "💪", label: "You got this" },
  { key: "heart", glyph: "❤️", label: "Love this" },
  { key: "fire", glyph: "🔥", label: "On fire" },
];

export function ReactionBar({ goalId }: { goalId: Id<"goals"> }) {
  const visitorKey = useVisitorKey();
  const { isAuthenticated } = useCurrentUser();
  const stats = useQuery(api.reactions.publicStats, { goalId });
  const mine = useQuery(
    api.reactions.visitorEmoji,
    visitorKey ? { goalId, visitorKey } : "skip"
  );
  const setEmoji = useMutation(api.reactions.setEmoji);
  const [burst, setBurst] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const onPick = async (emoji: typeof EMOJIS[number]["key"]) => {
    if (!visitorKey) return;
    setBurst(emoji);
    // If signed in, the backend auto-resolves the name from auth.
    // If not signed in, pass any name the visitor typed.
    const displayName = !isAuthenticated && nameInput.trim() ? nameInput.trim() : undefined;
    try {
      await setEmoji({ goalId, visitorKey, emoji, displayName });
    } finally {
      setTimeout(() => setBurst(null), 700);
    }
  };

  const total = stats?.emojiTotal ?? 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          Cheer them on
        </h3>
        <span className="text-xs text-[var(--color-text-dim)] tabular-nums">
          {total} {total === 1 ? "cheer" : "cheers"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {EMOJIS.map((e) => {
          const active = mine === e.key;
          const count = stats?.emojiCounts[e.key] ?? 0;
          return (
            <button
              key={e.key}
              onClick={() => onPick(e.key)}
              disabled={!visitorKey}
              className={`group relative flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition disabled:cursor-not-allowed ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg)]"
              }`}
              aria-pressed={active}
              aria-label={e.label}
            >
              <span className="relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={active ? `${e.key}-active` : `${e.key}-idle`}
                    initial={{ scale: 0.6, y: 4 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18 }}
                    className="text-2xl leading-none"
                  >
                    {e.glyph}
                  </motion.span>
                </AnimatePresence>
                {burst === e.key && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0, y: 0 }}
                    animate={{ scale: 1.4, opacity: 1, y: -16 }}
                    exit={{ opacity: 0, y: -28 }}
                    transition={{ duration: 0.6 }}
                    className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-2xl"
                  >
                    {e.glyph}
                  </motion.span>
                )}
              </span>
              <span
                className={`tabular-nums text-[10px] ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-dim)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {!isAuthenticated && (
        <div className="mt-2">
          {showNameInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={50}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <button
                onClick={() => setShowNameInput(false)}
                className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNameInput(true)}
              className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            >
              Add your name
            </button>
          )}
        </div>
      )}
    </div>
  );
}
