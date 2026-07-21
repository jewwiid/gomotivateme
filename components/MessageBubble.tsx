"use client";

import { motion } from "framer-motion";
import { relativeTime } from "@/lib/format";

export function MessageBubble({
  message,
  displayName,
  createdAt,
  index = 0,
}: {
  message: string;
  displayName?: string;
  createdAt: number;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
    >
      <p className="text-sm leading-relaxed text-[var(--color-text)]">"{message}"</p>
      <div className="mt-2.5 flex items-center justify-between text-xs text-[var(--color-text-dim)]">
        <span className="font-medium text-[var(--color-text-muted)]">
          {displayName || "Anonymous"}
        </span>
        <span>{relativeTime(createdAt)}</span>
      </div>
    </motion.div>
  );
}
