"use client";

import { motion } from "framer-motion";
import { PartyPopper, Trophy } from "lucide-react";

export function CompletionBanner({ goalTitle }: { goalTitle: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative overflow-hidden rounded-[var(--workspace-radius)] border border-[var(--color-success)] bg-[var(--color-success-soft)] p-6 sm:p-8"
    >
      <div className="relative flex flex-col items-center text-center">
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[2px] bg-[var(--color-success)] text-white"
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
        <PartyPopper size={18} className="mt-3 text-[var(--color-success-text)]" />
      </div>
    </motion.section>
  );
}
