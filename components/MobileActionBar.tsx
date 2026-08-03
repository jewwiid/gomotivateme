"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, Heart, Share2, MessageCircle, Sparkles } from "lucide-react";

/**
 * The 4-action sticky mobile action bar.
 *   [Support]  [Cheer]  [Encourage]  [Share]
 */
export function MobileActionBar({
  onSupport,
  onEncourage,
  onCheer,
  isOwner = false,
}: {
  onSupport: () => void;
  onEncourage: () => void;
  onCheer?: () => void;
  isOwner?: boolean;
}) {
  const [showShareToast, setShowShareToast] = useState(false);

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 240, damping: 22 }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2.5 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {!isOwner && (
            <button
              onClick={onSupport}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[2px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              <Heart size={14} />
              Support
            </button>
          )}
          {!isOwner && onCheer && (
            <button
              onClick={onCheer}
              aria-label="Cheer"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
            >
              <Sparkles size={14} />
            </button>
          )}
          {!isOwner && (
            <button
              onClick={onEncourage}
              aria-label="Encourage"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
            >
              <MessageCircle size={14} />
            </button>
          )}
          <button
            onClick={onShare}
            aria-label="Share goal"
            className={`grid h-11 shrink-0 place-items-center rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:border-[var(--color-primary)] ${
              isOwner ? "flex-1" : "w-11"
            }`}
          >
            <Share2 size={14} />
          </button>
        </div>
      </motion.div>
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-[2px] bg-[var(--color-text)] px-4 py-2 text-xs font-medium text-white md:hidden"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} />
              Link copied
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
