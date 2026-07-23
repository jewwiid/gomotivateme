"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
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
          <MilestoneCard
            key={m.id}
            goalId={goalId}
            milestone={m}
            isOwner={isOwner}
            delay={i * 0.04}
          />
        ))}
      </ol>
    </section>
  );
}

function MilestoneCard({
  goalId,
  milestone,
  isOwner,
  delay,
}: {
  goalId: Id<"goals">;
  milestone: Milestone;
  isOwner: boolean;
  delay: number;
}) {
  const toggleMilestone = useMutation(api.goals.toggleMilestone);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const onToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    setBusy(true);
    try {
      await toggleMilestone({ goalId, milestoneId: milestone.id, done: !milestone.done });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-xl border transition ${
        milestone.done
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
      }`}
    >
      {/* Header row — click to expand */}
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center gap-3 p-3"
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={!isOwner || busy}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed ${
            milestone.done
              ? "border-emerald-500 bg-emerald-500 text-black"
              : "border-[var(--color-border-strong)] bg-transparent text-transparent hover:border-[var(--color-text-muted)] disabled:hover:border-[var(--color-border-strong)]"
          }`}
          aria-label={milestone.done ? "Mark as not done" : "Mark as done"}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <span
          className={`flex-1 text-sm ${
            milestone.done
              ? "text-[var(--color-text-muted)] line-through"
              : "text-[var(--color-text)]"
          }`}
        >
          {milestone.title}
        </span>
        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp size={16} className="shrink-0 text-[var(--color-text-dim)]" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-[var(--color-text-dim)]" />
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--color-border)]"
          >
            <MilestoneFeed goalId={goalId} milestoneId={milestone.id} isOwner={isOwner} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/**
 * The per-milestone update feed + inline composer.
 * Shown when a milestone card is expanded.
 */
function MilestoneFeed({
  goalId,
  milestoneId,
  isOwner,
}: {
  goalId: Id<"goals">;
  milestoneId: string;
  isOwner: boolean;
}) {
  const updates = useQuery(anyApi.updates.listForMilestone, { goalId, milestoneId });

  if (updates === undefined) {
    return (
      <div className="p-4">
        <div className="h-12 animate-pulse rounded-lg bg-[var(--color-border)]/30" />
      </div>
    );
  }

  if (updates.length === 0 && !isOwner) {
    return (
      <div className="p-4 text-sm text-[var(--color-text-dim)]">
        No updates posted for this milestone yet.
      </div>
    );
  }

  return (
    <div className="p-4">
      {updates.length > 0 && (
        <div className="space-y-3">
          {updates.map((u: any) => (
            <MilestoneUpdateEntry key={u._id} update={u} />
          ))}
        </div>
      )}
      {isOwner && <MilestoneComposer goalId={goalId} milestoneId={milestoneId} />}
    </div>
  );
}

function MilestoneUpdateEntry({ update }: { update: any }) {
  const d = new Date(update.createdAt);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const isCompletion = update.type === "milestone";

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 pt-0.5">
        {isCompletion ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black">
            <Check size={11} />
          </div>
        ) : (
          <div className="h-2 w-2 rounded-full bg-[var(--color-text-dim)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            {isCompletion ? "Completed" : update.type}
          </span>
          <span className="text-[10px] text-[var(--color-text-dim)]">{dateStr}</span>
        </div>
        {update.note && (
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {update.note}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline composer for posting a note against a milestone. Owner only.
 */
function MilestoneComposer({
  goalId,
  milestoneId,
}: {
  goalId: Id<"goals">;
  milestoneId: string;
}) {
  const add = useMutation(api.updates.add);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await add({ goalId, type: "note", note: text, milestoneId });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-[var(--color-border)] pt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="What did you do towards this milestone?"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {busy ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
