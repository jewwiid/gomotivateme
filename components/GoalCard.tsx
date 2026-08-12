"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { ArrowRight, Calendar } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { formatDate, formatNumber } from "@/lib/format";
import { journeyIllustrationForProgress } from "@/lib/journeyIllustrations";

interface GoalDoc {
  _id: Id<"goals">;
  title: string;
  category: string;
  unit: string;
  startValue?: number;
  targetValue: number;
  currentValue?: number;
  direction: "increase" | "decrease";
  targetDate?: number;
  slug: string;
  createdAt: number;
  summary?: string;
  supporterCount?: number;
  coverImageId?: Id<"_storage">;
}

function pct(start: number | undefined, current: number | undefined, target: number, dir: "increase" | "decrease") {
  const s = start ?? 0;
  const c = current ?? s;
  const total = dir === "decrease" ? s - target : target - s;
  if (total <= 0) return 0;
  const moved = dir === "decrease" ? s - c : c - s;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

export function GoalCard({ goal, index }: { goal: GoalDoc; index: number }) {
  const progress = pct(goal.startValue, goal.currentValue, goal.targetValue, goal.direction);
  const daysLeft = goal.targetDate
    ? Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const fallbackMedia = journeyIllustrationForProgress(progress).src;

  // Look up the real cover image URL if the goal has one.
  const coverUrls = useQuery(
    api.storage.getUrls,
    goal.coverImageId ? { ids: [goal.coverImageId] } : "skip"
  );
  const coverUrl = goal.coverImageId && coverUrls ? (coverUrls as any)[goal.coverImageId] : null;
  const imgSrc = coverUrl ?? fallbackMedia;

  return (
    <motion.div whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Link
        href={`/dashboard/${goal._id}`}
        className="group grid gap-4 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_9rem_1.4rem] sm:items-center sm:gap-6"
      >
        <div className="relative aspect-[1.65/1] overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-sunken)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-dim)]">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{goal.category}</span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-[var(--color-text)]">
            {goal.title}
          </h3>
          {goal.summary && <p className="mt-1 line-clamp-1 text-sm text-[var(--color-text-muted)]">{goal.summary}</p>}
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 font-mono text-xs text-[var(--color-text-muted)]">
            <span>Progress</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-px bg-[var(--color-border-strong)]">
            <div className="h-px bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="text-sm text-[var(--color-text-muted)] sm:text-right">
          {goal.targetDate && (
            <div className="inline-flex items-center gap-1.5 sm:justify-end">
              <Calendar size={13} />
              {formatDate(goal.targetDate)}
            </div>
          )}
          <p className="mt-1 text-xs">
            {daysLeft === null
              ? `${formatNumber(goal.currentValue ?? goal.startValue ?? 0)} ${goal.unit}`
              : daysLeft < 0
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft === 0
              ? "Due today"
              : `${daysLeft}d left`}
          </p>
        </div>
        <ArrowRight size={19} className="hidden text-[var(--color-text-secondary)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)] sm:block" />
      </Link>
    </motion.div>
  );
}
