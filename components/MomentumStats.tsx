"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { TrendingUp, Users, Calendar, MessageCircle, Sparkles, Heart } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

/**
 * The "How much momentum has this person built?" stat block.
 * Five readable signals — no opaque gamified score.
 */
export function MomentumStats({
  goalId,
  progressPct,
  progressLabel,
  supporterCount,
  supporterTarget,
  unit,
  updatesCount,
  progressType,
  currentValue,
  targetValue,
}: {
  goalId: Id<"goals">;
  progressPct: number;
  progressLabel: string;
  supporterCount: number;
  supporterTarget: number | null;
  unit: string;
  updatesCount: number;
  progressType: "number" | "streak" | "milestones";
  currentValue: number;
  targetValue: number;
}) {
  const supporters = useQuery(api.supporters.listForGoal, { goalId, limit: 100 });
  const cheerStats = useQuery(api.reactions.publicStats, { goalId });
  const cheerTotal = cheerStats?.emojiTotal ?? 0;
  const accountabilityCount = useMemo(() => {
    if (!supporters) return 0;
    return (supporters as any[]).filter((s) => s.supportType === "checkin").length;
  }, [supporters]);

  const items = [
    {
      label: "Goal progress",
      value: `${Math.round(progressPct)}%`,
      sub: progressLabel,
      icon: TrendingUp,
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary-soft)]",
    },
    {
      label: "Supporters",
      value: String(supporterCount),
      sub: supporterTarget
        ? `${supporterTarget - supporterCount > 0 ? `${supporterTarget - supporterCount} to go` : "Target reached"}`
        : "Standing with them",
      icon: Users,
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary-soft)]",
    },
    {
      label: "Cheers",
      value: String(cheerTotal),
      sub: cheerTotal > 0 ? "People rooting for them" : "Be the first",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      label: "Accountability",
      value: String(accountabilityCount),
      sub: accountabilityCount > 0 ? "Regular check-ins" : "None yet",
      icon: Calendar,
      color: "text-[var(--color-success)]",
      bg: "bg-[var(--color-success-soft)]",
    },
    {
      label: "Updates",
      value: String(updatesCount),
      sub: updatesCount > 0 ? "Shared so far" : "First one soon",
      icon: MessageCircle,
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary-soft)]",
    },
    ...(progressType === "streak"
      ? [
          {
            label: "Current streak",
            value: `${currentValue}d`,
            sub: `Target: ${targetValue}d`,
            icon: Sparkles,
            color: "text-[var(--color-warning)]",
            bg: "bg-[var(--color-warning-soft)]",
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900">Momentum</h2>
      <p className="mt-1 text-xs text-zinc-500">
        The real human actions behind this goal.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${it.bg} ${it.color}`}>
                <Icon size={13} />
              </div>
              <div className="text-xl font-bold tabular-nums text-zinc-900">
                {it.value}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {it.label}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">{it.sub}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
