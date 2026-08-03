"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Loader2, Send, Plus, Trash2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  embedded = false,
}: {
  goalId: Id<"goals">;
  milestones: Milestone[];
  isOwner: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "" : "mt-10"}>
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
      {isOwner && <AddMilestone goalId={goalId} />}
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
  const removeMilestone = useMutation(api.goals.removeMilestone);
  const renameMilestone = useMutation(api.goals.renameMilestone);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(milestone.title);
  const [renaming, setRenaming] = useState(false);

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

  const onRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner || milestone.done) return;
    if (!confirm(`Remove "${milestone.title}"?`)) return;
    setRemoving(true);
    try {
      await removeMilestone({ goalId, milestoneId: milestone.id });
    } finally {
      setRemoving(false);
    }
  };

  const onRename = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draftTitle.trim() || draftTitle.trim() === milestone.title) {
      setEditingTitle(false);
      setDraftTitle(milestone.title);
      return;
    }
    setRenaming(true);
    try {
      await renameMilestone({ goalId, milestoneId: milestone.id, title: draftTitle.trim() });
      setEditingTitle(false);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-xl border transition ${
        milestone.done
          ? "border-[var(--color-success)] bg-[var(--color-success-soft)]"
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
              ? "border-[var(--color-success)] bg-[var(--color-success)] text-black"
              : "border-[var(--color-border-strong)] bg-transparent text-transparent hover:border-[var(--color-text-muted)] disabled:hover:border-[var(--color-border-strong)]"
          }`}
          aria-label={milestone.done ? "Mark as not done" : "Mark as done"}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        {editingTitle ? (
          <form onSubmit={onRename} className="flex flex-1 items-center gap-1">
            <input
              autoFocus
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingTitle(false);
                  setDraftTitle(milestone.title);
                }
              }}
              className="flex-1 rounded-md border border-[var(--color-primary)] bg-white px-2 py-1 text-sm text-[var(--color-text)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={renaming || !draftTitle.trim()}
              className="rounded-md p-1 text-[var(--color-success)] transition hover:bg-[var(--color-success)]/10 disabled:opacity-50"
              aria-label="Save"
            >
              {renaming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitle(false);
                setDraftTitle(milestone.title);
              }}
              className="rounded-md p-1 text-[var(--color-text-dim)] transition hover:bg-[var(--color-bg-elev)]"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <>
            <span
              className={`flex-1 text-sm ${
                milestone.done
                  ? "text-[var(--color-text-muted)] line-through"
                  : "text-[var(--color-text)]"
              }`}
            >
              {milestone.title}
            </span>
            {/* Edit button (owners only, undone milestones only) */}
            {isOwner && !milestone.done && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}
                className="shrink-0 rounded-md p-1 text-[var(--color-text-dim)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
                aria-label="Rename milestone"
              >
                <Pencil size={14} />
              </button>
            )}
            {/* Remove button (owners only, undone milestones only) */}
            {isOwner && !milestone.done && (
              <button
                type="button"
                onClick={onRemove}
                disabled={removing}
                className="shrink-0 rounded-md p-1 text-[var(--color-text-dim)] transition hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:opacity-50"
                aria-label="Remove milestone"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </>
        )}
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
  const updates = useQuery(api.updates.listForMilestone, { goalId, milestoneId });

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
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-black">
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

/**
 * Inline "Add milestone" input — owner only. Calls addMilestone mutation.
 */
function AddMilestone({ goalId }: { goalId: Id<"goals"> }) {
  const addMilestone = useMutation(api.goals.addMilestone);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await addMilestone({ goalId, title: title.trim() });
      setTitle("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a milestone…"
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
    </form>
  );
}
