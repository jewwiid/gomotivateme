"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function StorySection({
  story,
  embedded = false,
}: {
  story?: string;
  embedded?: boolean;
}) {
  if (!story || story.trim().length === 0) return null;
  const paragraphs = story.split(/\n{2,}/g);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={embedded ? "workspace-card scroll-mt-24 p-5" : "mt-8"}
    >
      <h2
        className={
          embedded
            ? "text-base font-bold text-[#262723]"
            : "mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
        }
      >
        Why this matters
      </h2>
      <div
        className={
          embedded
            ? "relative mt-4"
            : "relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:p-7"
        }
      >
        <Quote
          size={embedded ? 21 : 28}
          className={
            embedded
              ? "absolute -top-1 left-0 text-[var(--color-accent)]"
              : "absolute -top-3 left-5 fill-[var(--color-accent)] text-[var(--color-bg)]"
          }
        />
        <div
          className={`space-y-4 text-[15px] leading-relaxed text-[var(--color-text)] ${
            embedded ? "pl-8" : ""
          }`}
        >
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
