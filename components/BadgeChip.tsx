"use client";

import { motion } from "framer-motion";
import { Award, Trophy } from "lucide-react";

type Tier = 25 | 50 | 75 | 100;

const TIER_META: Record<Tier, { label: string; tone: string; icon: typeof Award }> = {
  25: { label: "25%", tone: "text-[var(--color-text-muted)]", icon: Award },
  50: { label: "50%", tone: "text-[var(--color-primary)]", icon: Award },
  75: { label: "75%", tone: "text-[var(--color-primary-dark)]", icon: Award },
  100: { label: "100%", tone: "text-[var(--color-success-text)]", icon: Trophy },
};

export function BadgeChip({
  tier,
  awardedAt,
  isNew = false,
}: {
  tier: Tier;
  awardedAt: number;
  isNew?: boolean;
}) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={isNew ? { scale: 0.6, rotate: -8, opacity: 0 } : false}
      animate={isNew ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 16 }}
      className={`inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium ${meta.tone}`}
      title={new Date(awardedAt).toLocaleString()}
    >
      <Icon size={12} />
      <span>{meta.label}</span>
    </motion.div>
  );
}

export type { Tier };
