"use client";

import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useVisitorKey } from "@/lib/useVisitorKey";

export function ThumbsUpButton({ goalId }: { goalId: Id<"goals"> }) {
  const visitorKey = useVisitorKey();
  const hasThumbed = useQuery(
    api.reactions.hasThumbed,
    visitorKey ? { goalId, visitorKey } : "skip"
  );
  const stats = useQuery(api.reactions.publicStats, { goalId });
  const thumbsUp = useMutation(api.reactions.thumbsUp);
  const [pulsing, setPulsing] = useState(false);

  const onClick = async () => {
    if (!visitorKey || hasThumbed) return;
    setPulsing(true);
    try {
      await thumbsUp({ goalId, visitorKey });
    } finally {
      setTimeout(() => setPulsing(false), 600);
    }
  };

  const count = stats?.thumbsCount ?? 0;
  const active = !!hasThumbed;

  return (
    <button
      onClick={onClick}
      disabled={!visitorKey || active}
      className={`group relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
      aria-pressed={active}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={pulsing || active ? "filled" : "outline"}
          initial={{ scale: 0.7, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 18 }}
          className="inline-flex"
        >
          <ThumbsUp size={16} className={active ? "fill-current" : ""} />
        </motion.span>
      </AnimatePresence>
      <span className="tabular-nums">{count}</span>
      <span className="hidden sm:inline">{active ? "Cheering" : "Cheer them on"}</span>
    </button>
  );
}
