"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Milestone {
  id: string;
  title: string;
  done: boolean;
  completedAt?: number;
}

export function MilestonesList({
  goalId,
  milestones,
  isOwner,
  currentValue,
  targetValue,
  unit,
}: {
  goalId: Id<"goals">;
  milestones: Milestone[];
  isOwner: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
}) {
  const toggleMilestone = useMutation(api.goals.toggleMilestone);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onToggle = async (m: Milestone) => {
    setBusyId(m.id);
    try {
      await toggleMilestone({ goalId, milestoneId: m.id, done: !m.done });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Milestones
        <span className="font-mono text-xs tabular-nums text-[var(--color-text-dim)]">
          {currentValue} / {targetValue} {unit}
        </span>
      </h2>
      <ol className="space-y-2">
        {milestones.map((m, i) => (
          <motion.li
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              m.done
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
            }`}
          >
            <button
              type="button"
              onClick={() => isOwner && onToggle(m)}
              disabled={!isOwner || busyId === m.id}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed ${
                m.done
                  ? "border-emerald-500 bg-emerald-500 text-black"
                  : "border-[var(--color-border-strong)] bg-transparent text-transparent hover:border-[var(--color-text-muted)] disabled:hover:border-[var(--color-border-strong)]"
              }`}
              aria-label={m.done ? "Mark as not done" : "Mark as done"}
            >
              <Check size={14} />
            </button>
            <span
              className={`text-sm ${
                m.done
                  ? "text-[var(--color-text-muted)] line-through"
                  : "text-[var(--color-text)]"
              }`}
            >
              {m.title}
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
