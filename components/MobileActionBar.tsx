"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles } from "lucide-react";

/**
 * The sticky mobile action bar for goal participation.
 * Sharing lives in the page header/support card so it is not duplicated here.
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
  if (isOwner) return null;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 240, damping: 22 }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2.5 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button
          onClick={onSupport}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[2px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          <Heart size={14} />
          Support
        </button>
        {onCheer && (
          <button
            onClick={onCheer}
            aria-label="Cheer"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
          >
            <Sparkles size={14} />
          </button>
        )}
        <button
          onClick={onEncourage}
          aria-label="Encourage"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
        >
          <MessageCircle size={14} />
        </button>
      </div>
    </motion.div>
  );
}
