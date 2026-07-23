"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, Copy, Heart, Share2, MessageCircle, X } from "lucide-react";

/**
 * The 3-action sticky mobile action bar.
 *   [Support]  [Encourage]  [Share]
 */
export function MobileActionBar({
  onSupport,
  onEncourage,
  isOwner = false,
}: {
  onSupport: () => void;
  onEncourage: () => void;
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-3 py-2.5 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {!isOwner && (
            <button
              onClick={onSupport}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              <Heart size={14} />
              Support
            </button>
          )}
          {!isOwner && (
            <button
              onClick={onEncourage}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
            >
              <MessageCircle size={14} />
              Encourage
            </button>
          )}
          <button
            onClick={onShare}
            className={`flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400 ${
              isOwner ? "flex-1" : ""
            }`}
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </motion.div>
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-lg md:hidden"
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
