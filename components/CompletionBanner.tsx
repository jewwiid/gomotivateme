"use client";

import { motion } from "framer-motion";
import { PartyPopper, Trophy } from "lucide-react";

export function CompletionBanner({ goalTitle }: { goalTitle: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--color-gold)]/40 bg-gradient-to-br from-[var(--color-accent)]/15 via-[var(--color-gold)]/15 to-[var(--color-accent)]/10 p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[var(--color-gold)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
      <div className="relative flex flex-col items-center text-center">
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-accent)] text-black shadow-lg"
        >
          <Trophy size={28} />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          They did it!
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text)]">{goalTitle}</span> hit 100%.
          Leave a final note to celebrate.
        </p>
        <PartyPopper size={18} className="mt-3 text-[var(--color-accent)]" />
      </div>
    </motion.section>
  );
}
