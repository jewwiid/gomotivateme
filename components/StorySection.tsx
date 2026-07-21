"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function StorySection({ story }: { story?: string }) {
  if (!story || story.trim().length === 0) return null;
  const paragraphs = story.split(/\n{2,}/g);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-8"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Why this matters
      </h2>
      <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:p-7">
        <Quote
          size={28}
          className="absolute -top-3 left-5 fill-[var(--color-accent)] text-[var(--color-bg)]"
        />
        <div className="space-y-4 text-[15px] leading-relaxed text-[var(--color-text)]">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {p}
            </p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
