"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ChevronRight } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "./CategoryIcon";
import { ProgressBar } from "./ProgressBar";
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
  targetDate: number;
  slug: string;
  publicEnabled: boolean;
  createdAt: number;
}

function pct(
  start: number,
  current: number,
  target: number,
  dir: "increase" | "decrease"
) {
  const total = dir === "decrease" ? start - target : target - start;
  if (total <= 0) return 0;
  const moved = dir === "decrease" ? start - current : current - start;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

export function GoalCard({ goal }: { goal: GoalDoc }) {
  const progress = pct(goal.startValue, goal.currentValue, goal.targetValue, goal.direction);
  const daysLeft = Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group"
    >
      <Link
        href={`/dashboard/${goal._id}`}
        className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 transition hover:border-[var(--color-border-strong)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-bg-elev)] text-[var(--color-text-muted)]">
              <CategoryIcon category={goal.category} size={14} />
            </span>
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              {goal.category}
            </span>
          </div>
          <ChevronRight
            size={16}
            className="text-[var(--color-text-dim)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-text)]"
          />
        </div>

        <h3 className="mb-1 text-lg font-semibold leading-tight">{goal.title}</h3>

        <div className="mb-4 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(goal.targetDate)}
          </span>
          <span
            className={`tabular-nums ${
              daysLeft < 0
                ? "text-[var(--color-danger)]"
                : daysLeft < 7
                ? "text-[var(--color-gold)]"
                : ""
            }`}
          >
            {daysLeft < 0
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft === 0
              ? "Due today"
              : `${daysLeft}d left`}
          </span>
        </div>

        <ProgressBar value={progress} size="sm" />

        <div className="mt-3 flex items-baseline justify-between text-xs text-[var(--color-text-muted)]">
          <span className="tabular-nums">
            <span className="text-[var(--color-text)]">
              {formatNumber(goal.currentValue)}
            </span>{" "}
            / {formatNumber(goal.targetValue)} {goal.unit}
          </span>
          <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
        </div>
      </Link>
    </motion.div>
  );
}
