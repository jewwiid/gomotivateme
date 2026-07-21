"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";

export function StickyCta({
  goalId,
  emojiCounts,
  total,
  onCheerClick,
}: {
  goalId: string;
  emojiCounts?: { thumbsup: number; muscle: number; heart: number; fire: number };
  total: number;
  onCheerClick?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 240, damping: 22 }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 py-3 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button
          onClick={onShare}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? "Link copied" : "Share"}
        </button>
        <button
          onClick={onCheerClick}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <span aria-hidden>💪</span>
          Cheer {total > 0 && <span className="tabular-nums text-xs text-[var(--color-text-dim)]">· {total}</span>}
        </button>
      </div>
    </motion.div>
  );
}
