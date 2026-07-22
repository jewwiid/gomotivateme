"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "./CategoryIcon";
import { formatDate, formatNumber } from "@/lib/format";

interface GoalDoc {
  _id: Id<"goals">;
  title: string;
  category: string;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  direction: "increase" | "decrease";
  targetDate?: number;
  slug: string;
  createdAt: number;
  summary?: string;
  supporterCount?: number;
}

const goalMedia = [
  "/illustrations/steps/move-v3.webp",
  "/illustrations/steps/plan-v3.webp",
  "/illustrations/steps/share-v3.webp",
  "/illustrations/steps/together-v3.webp",
];

function pct(start: number, current: number, target: number, dir: "increase" | "decrease") {
  const total = dir === "decrease" ? start - target : target - start;
  if (total <= 0) return 0;
  const moved = dir === "decrease" ? start - current : current - start;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

export function GoalCard({ goal }: { goal: GoalDoc }) {
  const progress = pct(goal.startValue, goal.currentValue, goal.targetValue, goal.direction);
  const daysLeft = goal.targetDate
    ? Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const media = goalMedia[Math.abs(goal.category.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % goalMedia.length];

  return (
    <motion.div whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Link
        href={`/dashboard/${goal._id}`}
        className="group grid gap-4 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_9rem_1.4rem] sm:items-center sm:gap-6"
      >
        <div className="relative aspect-[1.65/1] overflow-hidden rounded-xl bg-[#e5eaf8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#777872]">
            <CategoryIcon category={goal.category} size={12} />
            {goal.category}
          </div>
          <h3 className="mt-1.5 line-clamp-2 font-display text-xl font-bold leading-tight tracking-[-0.035em] text-[#2b2b28]">
            {goal.title}
          </h3>
          {goal.summary && <p className="mt-1 line-clamp-1 text-sm text-[#72736e]">{goal.summary}</p>}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#777872]">Progress</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce5ff]">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm font-bold tabular-nums text-[#33332f]">{Math.round(progress)}% complete</p>
        </div>
        <div className="text-sm text-[#666762] sm:text-right">
          {goal.targetDate && (
            <div className="inline-flex items-center gap-1.5 sm:justify-end">
              <Calendar size={13} />
              {formatDate(goal.targetDate)}
            </div>
          )}
          <p className="mt-1 text-xs">
            {daysLeft === null
              ? `${formatNumber(goal.currentValue)} ${goal.unit}`
              : daysLeft < 0
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft === 0
              ? "Due today"
              : `${daysLeft}d left`}
          </p>
        </div>
        <ArrowRight size={19} className="hidden text-[#555650] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)] sm:block" />
      </Link>
    </motion.div>
  );
}
