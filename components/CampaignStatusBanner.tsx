"use client";

import { motion } from "framer-motion";
import { Pause, CheckCircle2, Archive } from "lucide-react";
import { formatDate } from "@/lib/format";

export function CampaignStatusBanner({
  status,
  pausedReason,
  completedAt,
}: {
  status: "active" | "paused" | "completed" | "closed" | "draft";
  pausedReason?: string;
  completedAt?: number;
}) {
  if (status === "active") return null;

  const meta: Record<string, { bg: string; border: string; icon: any; title: string; body: string }> = {
    paused: {
      bg: "bg-[var(--color-warning)] 500/10",
      border: "border-[var(--color-warning)] 500/30",
      icon: Pause,
      title: "Paused",
      body: pausedReason ?? "Taking a break. They'll be back.",
    },
    completed: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
      title: "Completed!",
      body: completedAt
        ? `Finished on ${formatDate(completedAt)}.`
        : "They did it. Take a look at the full journey below.",
    },
    closed: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/30",
      icon: Archive,
      title: "Closed",
      body: "This campaign is no longer active.",
    },
    draft: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/30",
      icon: Archive,
      title: "Draft",
      body: "Not published yet.",
    },
  };

  const m = meta[status];
  const Icon = m.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 rounded-2xl border ${m.border} ${m.bg} p-4`}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/20">
        <Icon size={18} className="text-current" />
      </div>
      <div>
        <div className="text-base font-semibold">{m.title}</div>
        <p className="text-sm text-[var(--color-text-muted)]">{m.body}</p>
      </div>
    </motion.div>
  );
}
