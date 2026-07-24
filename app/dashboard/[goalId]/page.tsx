"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Pause,
  PauseCircle,
  PlayCircle,
  Plus,
  Send,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  CheckCircle2,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { MotivationCircleManager } from "@/components/MotivationCircleManager";
import { ApplicationQueue } from "@/components/ApplicationQueue";
import { ProgressBar } from "@/components/ProgressBar";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { DualProgress } from "@/components/DualProgress";
import { MilestonesList } from "@/components/MilestonesList";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { prepareProgressImage } from "@/lib/media";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function GoalDetailPage() {
  return (
    <RequireAuth>
      <GoalDetailContent />
    </RequireAuth>
  );
}

const SUPPORT_TYPE_LABELS: Record<string, string> = {
  encourage: "Encouraging",
  experience: "Sharing experience",
  advice: "Offering advice",
  checkin: "Checking in",
  join: "Joined the challenge",
};

const supportTypeLabel = (raw: string): string =>
  SUPPORT_TYPE_LABELS[raw] ?? raw;

function GoalDetailContent() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId as Id<"goals">;
  const router = useRouter();

  const { user: _user } = useCurrentUser();
  const goal = useQuery(api.goals.getMine, { goalId });
  const updates = useQuery(api.updates.listForOwner, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const stats = useQuery(api.reactions.publicStats, { goalId });
  const supporters = useQuery(api.supporters.listForOwner, { goalId });
  const supportMessages = useQuery(api.supportMessages.listForOwner, { goalId });

  const updateImageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    for (const update of updates ?? []) {
      if (update.imageId) ids.add(update.imageId);
      for (const media of update.media ?? []) {
        if (media.kind === "image") {
          if (media.storageId) ids.add(media.storageId);
          if (media.thumbnailId) ids.add(media.thumbnailId);
        }
      }
    }
    return Array.from(ids);
  }, [updates]);
  const updateImageUrls = useQuery(
    api.storage.getUrls,
    updateImageIds.length > 0 ? { ids: updateImageIds } : "skip"
  );
  const updateImageUrlOf = (imageId: Id<"_storage">) => updateImageUrls?.[imageId] ?? null;

  const [showUpdate, setShowUpdate] = useState<null | "note" | "media" | "link" | "value" | "milestone" | "streak">(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showAllSupporters, setShowAllSupporters] = useState(false);

  const publicUrl = useMemo(() => {
    if (!goal) return "";
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    return `${base}/o/${goal.slug}`;
  }, [goal]);

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  if (goal === undefined) {
    return (
      <div className="min-h-screen bg-[#fffdf8]">
        <Header />
        <main className="mx-auto max-w-[80rem] px-5 py-12 sm:px-8">
          <div className="h-40 animate-pulse rounded-[1rem] bg-[#f0efe9]" />
        </main>
      </div>
    );
  }
  if (goal === null) {
    return (
      <div className="min-h-screen bg-[#fffdf8]">
        <Header />
        <main className="mx-auto max-w-[48rem] px-5 py-20 text-center sm:px-8">
          <p className="text-[var(--color-text-muted)]">Goal not found.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to goals
          </Link>
        </main>
      </div>
    );
  }

  const progress = computeProgress(goal);
  const daysLeft = goal.targetDate
    ? Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const supporterCount = goal.supporterCount ?? 0;
  const supporterTarget = goal.supporterTarget ?? null;
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const isClosed = goal.status === "closed";

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto max-w-[80rem] px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/dashboard"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#686963] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={14} />
          Back to goals
        </Link>

        {/* Status badge */}
        <div className="mb-3 flex items-center gap-2">
          <StatusPill status={goal.status} />
          {isPaused && goal.pausedReason && (
            <span className="text-xs text-[var(--color-text-muted)]">· {goal.pausedReason}</span>
          )}
        </div>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-[#deddd6] pb-10"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#777872]">
            <CategoryIcon category={goal.category} size={12} />
            {goal.category}
          </div>
          <h1 className="max-w-4xl font-display text-balance text-4xl font-bold leading-[0.94] tracking-[-0.06em] sm:text-6xl">{goal.title}</h1>
          {goal.summary && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#686963]">{goal.summary}</p>
          )}
          {goal.story && (
            <p className="mt-3 max-w-3xl line-clamp-3 text-sm leading-6 text-[#777872]">{goal.story}</p>
          )}
          {goal.moderationStatus && goal.moderationStatus !== "approved" && (
            <div className={`mt-5 max-w-2xl rounded-xl border px-4 py-3 text-sm ${
              goal.moderationStatus === "rejected"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              <span className="font-semibold">
                {goal.moderationStatus === "pending" ? "Your goal is being checked." : goal.moderationStatus === "review" ? "Your goal needs a safety review." : "Your goal is not public."}
              </span>{" "}
              {goal.moderationReason ?? "Only you can see it until this is resolved."}
            </div>
          )}

          <div className="mt-5">
            <DualProgress
              goalPct={progress}
              supporterCount={supporterCount}
              supporterTarget={supporterTarget}
              goalLabel={
                goal.progressType === "milestones"
                  ? `${goal.currentValue} of ${goal.targetValue} milestones`
                  : goal.progressType === "streak"
                  ? `${goal.currentValue} day streak`
                  : `${formatNumber(goal.currentValue ?? 0)} of ${formatNumber(goal.targetValue ?? 0)} ${goal.unit}`
              }
              unit={goal.unit}
            />
          </div>

          {badges && badges.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-4">
              <span className="mr-1 inline-flex items-center gap-1 text-xs text-[var(--color-text-dim)]">
                <Trophy size={11} />
                Milestones
              </span>
              {badges
                .sort((a: any, b: any) => a.tier - b.tier)
                .map((b: any) => (
                  <BadgeChip key={b._id} tier={b.tier} awardedAt={b.awardedAt} />
                ))}
            </div>
          )}

          {/* Status actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#deddd6] pt-5">
            {!isCompleted && !isClosed && (
              <button
                onClick={() => setShowStatus(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#c9c8c0] bg-white px-4 py-2 text-xs font-semibold text-[#454540] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                {isPaused ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                {isPaused ? "Resume" : "Pause / complete"}
              </button>
            )}
            {daysLeft !== null && (
              <span className="text-xs text-[var(--color-text-dim)]">
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                  ? "Due today"
                  : `${daysLeft}d left`}
              </span>
            )}
          </div>

          {/* Share link */}
          <div className="mt-6 border-y border-dashed border-[#c9c8c0] py-4">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              Your public link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-[var(--color-bg)] px-2 py-1.5 font-mono text-xs text-[var(--color-text)]">
                {publicUrl}
              </code>
              <button
                onClick={onCopyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                {linkCopied ? "Copied" : "Copy"}
              </button>
              <Link
                href={`/o/${goal.slug}`}
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c9c8c0] px-4 py-2 text-xs font-semibold text-[#454540] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <ExternalLink size={12} />
                Open
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Motivation Circle — pre-launch + active */}
        <div className="mt-6">
          <MotivationCircleManager
            goalId={goalId}
            goalStatus={goal.status}
            coreMotivatorMin={goal.coreMotivatorMin ?? 3}
            preLaunchDeadline={goal.preLaunchDeadline}
          />
        </div>

        {/* Public motivator application queue (owner only) */}
        {goal.publicMotivatorPolicy !== "disabled" && (
          <div className="mt-4">
            <ApplicationQueue goalId={goalId} />
          </div>
        )}

        {/* Status modal */}
        <AnimatePresence>
          {showStatus && (
            <StatusModal
              goalId={goalId}
              currentStatus={goal.status}
              onClose={() => setShowStatus(false)}
            />
          )}
        </AnimatePresence>

        {/* Goal settings (cover + story + support types + target) */}
        <GoalSettings
          goalId={goalId}
          title={goal.title}
          summary={goal.summary}
          story={goal.story}
          coverImageId={goal.coverImageId}
          supporterTarget={goal.supporterTarget}
          supportTypes={goal.supportTypes}
          visibility={goal.visibility}
          targetValue={goal.targetValue}
          startValue={goal.startValue}
          unit={goal.unit}
          direction={goal.direction}
          progressType={goal.progressType}
          onDeleted={() => router.push("/dashboard")}
        />

        {/* Milestones (if milestone template) */}
        {goal.progressType === "milestones" && goal.milestones && goal.milestones.length > 0 && (
          <div className="mt-10 border-y border-[#deddd6] py-7">
            <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.04em]">
              Milestones
            </h2>
            <MilestonesList
              goalId={goalId}
              milestones={goal.milestones}
              isOwner={true}
              currentValue={goal.currentValue ?? 0}
              targetValue={goal.targetValue ?? 0}
              unit={goal.unit}
            />
          </div>
        )}

        {/* Quick add */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6"
        >
          <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.04em]">
            Log progress
          </h2>
          <div className="grid divide-x divide-[#deddd6] border-y border-[#deddd6] sm:grid-cols-4">
            <QuickAddButton
              icon={TrendingUp}
              label={goal.progressType === "streak" ? "Mark today" : "New value"}
              onClick={() => setShowUpdate(goal.progressType === "streak" ? "streak" : "value")}
              disabled={goal.progressType !== "number" && goal.progressType !== "streak"}
            />
            <QuickAddButton
              icon={MessageSquare}
              label="Note"
              onClick={() => setShowUpdate("note")}
            />
            <QuickAddButton
              icon={ImageIcon}
              label="Media"
              onClick={() => setShowUpdate("media")}
            />
            <QuickAddButton
              icon={LinkIcon}
              label="Link"
              onClick={() => setShowUpdate("link")}
            />
          </div>
        </motion.div>

        {/* Update modal */}
        <AnimatePresence>
          {showUpdate && (
            <UpdateModal
              type={showUpdate}
              goalId={goalId}
              unit={goal.unit}
              milestones={goal.milestones ?? []}
              onClose={() => setShowUpdate(null)}
            />
          )}
        </AnimatePresence>

        {/* Supporters inbox */}
        {supporters && supporters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-10"
          >
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
              Your support team ({supporters.length})
            </h2>
            <div className="space-y-2">
              {(showAllSupporters ? supporters : supporters.slice(0, 10)).map((s: any) => {
                const msg = supportMessages?.find((m: any) => m.authorId === s.userId && !m.hiddenAt);
                return (
                  <div
                    key={s._id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{supportTypeLabel(s.supportType)}</span>
                      <span className="text-xs text-[var(--color-text-dim)]">
                        {relativeTime(s.createdAt)}
                      </span>
                    </div>
                    {s.pledge && (
                      <p className="mt-1 text-xs italic text-[var(--color-text-muted)]">"{s.pledge}"</p>
                    )}
                    {msg && (
                      <p className="mt-1.5 text-sm text-[var(--color-text)]">{msg.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {supporters.length > 10 && (
              <button
                onClick={() => setShowAllSupporters((v) => !v)}
                className="mt-3 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
              >
                {showAllSupporters
                  ? "Show fewer"
                  : `Show all ${supporters.length} supporters`}
              </button>
            )}
          </motion.div>
        )}

        {/* Public timeline preview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10"
        >
          <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
            Public timeline
          </h2>
          {updates === undefined ? (
            <div className="h-32 animate-pulse rounded-2xl bg-[var(--color-bg-card)]" />
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 p-6 text-center text-sm text-[var(--color-text-dim)]">
              No updates yet. Log a value or post a note to start the timeline.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u: any, i: number) => (
                <UpdateCard
                  key={u._id}
                  update={u}
                  imageUrl={u.imageId ? updateImageUrlOf(u.imageId) : null}
                  imageUrlOf={updateImageUrlOf}
                  unit={goal.unit}
                  direction={goal.direction}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Active", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: PlayCircle },
    paused: { label: "Paused", color: "bg-[var(--color-warning)] 500/15 text-[var(--color-warning)] 400 border-[var(--color-warning)] 500/30", icon: Pause },
    completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    closed: { label: "Closed", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: Archive },
    draft: { label: "Draft", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: Archive },
  };
  const m = meta[status] ?? meta.active;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.color}`}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

function StatusModal({
  goalId,
  currentStatus,
  onClose,
}: {
  goalId: Id<"goals">;
  currentStatus: string;
  onClose: () => void;
}) {
  const setStatus = useMutation(api.goals.setStatus);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const transition = async (status: any, pausedReason?: string) => {
    setBusy(true);
    try {
      await setStatus({ goalId, status, pausedReason });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Campaign status</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {currentStatus === "paused" ? (
          <button
            onClick={() => transition("active")}
            disabled={busy}
            className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-sm font-medium transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <PlayCircle size={14} className="mr-2 inline text-emerald-400" />
            Resume the campaign
          </button>
        ) : currentStatus === "completed" ? (
          <p className="text-sm text-[var(--color-text-muted)]">This campaign is complete.</p>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => transition("paused", reason || "Taking a break")}
              disabled={busy}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-left text-sm font-medium transition hover:border-[var(--color-warning)] 500/40 disabled:opacity-50"
            >
              <Pause size={14} className="mr-2 inline text-[var(--color-warning)] 400" />
              Pause the campaign
            </button>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional), e.g. 'Need a week to reset'"
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <button
              onClick={() => transition("completed")}
              disabled={busy}
              className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-sm font-medium transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 size={14} className="mr-2 inline text-emerald-400" />
              Mark as completed
            </button>
            <button
              onClick={() => transition("closed")}
              disabled={busy}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-left text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-text-muted)] disabled:opacity-50"
            >
              <Archive size={14} className="mr-2 inline" />
              Close the campaign
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function computeProgress(g: any) {
  if (g.progressType === "milestones") {
    if (!g.milestones || g.milestones.length === 0) return 0;
    return (g.currentValue / g.targetValue) * 100;
  }
  const total = g.direction === "decrease" ? g.startValue - g.targetValue : g.targetValue - g.startValue;
  if (total <= 0) return 0;
  const moved = g.direction === "decrease" ? g.startValue - g.currentValue : g.currentValue - g.startValue;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

function QuickAddButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof TrendingUp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function UpdateModal({
  type,
  goalId,
  unit,
  milestones,
  onClose,
}: {
  type: "note" | "media" | "link" | "value" | "milestone" | "streak";
  goalId: Id<"goals">;
  unit: string;
  milestones: any[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {type === "note" && "Add a note"}
            {type === "media" && "Share progress media"}
            {type === "link" && "Add a link"}
            {type === "value" && `New ${unit} value`}
            {type === "milestone" && "Mark milestone done"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {type === "note" && <NoteForm goalId={goalId} onDone={onClose} />}
        {type === "media" && <MediaForm goalId={goalId} onDone={onClose} />}
        {type === "link" && <LinkForm goalId={goalId} onDone={onClose} />}
        {type === "value" && <ValueForm goalId={goalId} unit={unit} onDone={onClose} />}
        {type === "streak" && <StreakForm goalId={goalId} onDone={onClose} />}
        {type === "milestone" && (
          <MilestoneForm goalId={goalId} milestones={milestones} onDone={onClose} />
        )}
      </motion.div>
    </motion.div>
  );
}

function NoteForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const add = useMutation(api.updates.add);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await add({ goalId, type: "note", note: text });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        required
        placeholder="What happened today?"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Send size={14} />
        {busy ? "Posting..." : "Post update"}
      </button>
    </form>
  );
}

function MediaForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const generateUploadUrl = useMutation(api.updates.generateMediaUploadUrl);
  const addMedia = useMutation(api.updates.addMedia);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Posting...");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [embedUrls, setEmbedUrls] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onFiles = (selected: FileList | null) => {
    const next = Array.from(selected ?? []);
    setErr(null);
    if (next.length > 6) {
      setErr("You can share up to 6 photos at a time.");
      return;
    }
    if (next.some((file) => !file.type.startsWith("image/") || file.size > 25 * 1024 * 1024)) {
      setErr("Choose image files smaller than 25 MB. We’ll optimise them before upload.");
      return;
    }
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
    if (fileInput.current) fileInput.current.value = "";
  };

  const urls = embedUrls.split("\n").map((url) => url.trim()).filter(Boolean);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!files.length && !urls.length) {
          setErr("Add at least one photo or public video link.");
          return;
        }
        if (urls.length > 3) {
          setErr("You can share up to 3 public video links at a time.");
          return;
        }
        setBusy(true);
        setErr(null);
        try {
          const uploadFile = async (file: File) => {
            const { uploadUrl, uploadToken } = await generateUploadUrl({ goalId });
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });
            if (!response.ok) throw new Error("A photo could not be uploaded");
            const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
            return { storageId, uploadToken };
          };

          const uploads = [];
          for (let index = 0; index < files.length; index += 1) {
            setBusyLabel(`Optimising photo ${index + 1} of ${files.length}...`);
            const prepared = await prepareProgressImage(files[index]);
            if (prepared.display.size > 10 * 1024 * 1024) {
              throw new Error("A photo could not be optimised below the 10 MB upload limit");
            }
            const display = await uploadFile(prepared.display);
            let thumbnail: { storageId: Id<"_storage">; uploadToken: string } | undefined;
            if (prepared.thumbnail) {
              if (prepared.thumbnail.size > 1 * 1024 * 1024) {
                throw new Error("A photo preview could not be optimised for the feed");
              }
              thumbnail = await uploadFile(prepared.thumbnail);
            }
            uploads.push({
              storageId: display.storageId,
              uploadToken: display.uploadToken,
              thumbnailId: thumbnail?.storageId,
              thumbnailUploadToken: thumbnail?.uploadToken,
            });
          }
          setBusyLabel("Posting update...");
          await addMedia({ goalId, note: caption || undefined, uploads, embedUrls: urls });
          onDone();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setBusy(false);
          setBusyLabel("Posting...");
        }
      }}
      className="space-y-3"
    >
      <div
        onClick={() => fileInput.current?.click()}
        className="flex min-h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-5 transition hover:border-[var(--color-accent)]"
      >
        {previews.length > 0 ? (
          <div className="grid w-full grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={preview} className="group relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-[var(--color-text-dim)]">
            <ImageIcon size={20} />
            <span>Choose up to 6 photos</span>
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Add context for this progress update (optional)"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <textarea
        value={embedUrls}
        onChange={(e) => setEmbedUrls(e.target.value)}
        rows={2}
        placeholder="Paste public YouTube, TikTok, or Instagram links, one per line"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <p className="text-xs leading-relaxed text-[var(--color-text-dim)]">
        Only public posts can be embedded. You can combine photos and social proof in one update.
      </p>
      {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}
      <button
        type="submit"
        disabled={busy || (!files.length && !urls.length)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Plus size={14} />
        {busy ? busyLabel : "Post media update"}
      </button>
    </form>
  );
}

function LinkForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const add = useMutation(api.updates.add);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await add({ goalId, type: "link", linkUrl: url, linkTitle: title || undefined });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <input
        autoFocus
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        placeholder="https://..."
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Optional title"
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Send size={14} />
        {busy ? "Posting..." : "Post link"}
      </button>
    </form>
  );
}

function ValueForm({
  goalId,
  unit,
  onDone,
}: {
  goalId: Id<"goals">;
  unit: string;
  onDone: () => void;
}) {
  const recordValue = useMutation(api.goals.recordValue);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await recordValue({
            goalId,
            value: parseFloat(value),
            note: note || undefined,
          });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
          New measured value ({unit})
        </label>
        <input
          autoFocus
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="How did it go? (optional)"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !value}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Plus size={14} />
        {busy ? "Saving..." : "Log value"}
      </button>
    </form>
  );
}

function StreakForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const logStreakDay = useMutation(api.goals.logStreakDay);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await logStreakDay({ goalId, note: note || undefined });
          onDone();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Could not log streak day");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2.5">
        <p className="text-sm font-medium text-[var(--color-text)]">
          Mark today as done
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Your streak count goes up by 1. You can do this once per day.
        </p>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="How did it go? (optional)"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Plus size={14} />
        {busy ? "Saving..." : "Mark today"}
      </button>
    </form>
  );
}

function MilestoneForm({
  goalId,
  milestones,
  onDone,
}: {
  goalId: Id<"goals">;
  milestones: any[];
  onDone: () => void;
}) {
  const toggleMilestone = useMutation(api.goals.toggleMilestone);
  const undone = milestones.filter((m) => !m.done);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {undone.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">All milestones are already done.</p>
      ) : (
        undone.map((m) => (
          <button
            key={m.id}
            disabled={busy === m.id}
            onClick={async () => {
              setBusy(m.id);
              try {
                await toggleMilestone({ goalId, milestoneId: m.id, done: true });
                onDone();
              } finally {
                setBusy(null);
              }
            }}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-left text-sm font-medium transition hover:border-emerald-500/40 disabled:opacity-50"
          >
            {m.title}
            <span className="ml-2 text-xs text-[var(--color-text-dim)]">
              {busy === m.id ? "Marking..." : "Mark done"}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function GoalSettings({
  goalId,
  title,
  summary,
  story,
  coverImageId,
  supporterTarget,
  supportTypes,
  visibility,
  targetValue,
  startValue,
  unit,
  direction,
  progressType,
  onDeleted,
}: {
  goalId: Id<"goals">;
  title: string;
  summary?: string;
  story?: string;
  coverImageId?: Id<"_storage">;
  supporterTarget?: number;
  supportTypes: string[];
  visibility: string;
  targetValue?: number;
  startValue?: number;
  unit?: string;
  direction?: "increase" | "decrease";
  progressType?: string;
  onDeleted: () => void;
}) {
  const updateGoal = useMutation(api.goals.update);
  const removeGoal = useMutation(api.goals.remove);
  const generateUploadUrl = useMutation(api.updates.generateUploadUrl);
  const coverUrl = useQuery(
    api.storage.getUrls,
    coverImageId ? { ids: [coverImageId] } : "skip"
  );

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftSummary, setDraftSummary] = useState(summary ?? "");
  const [draftStory, setDraftStory] = useState(story ?? "");
  const [draftCover, setDraftCover] = useState<Id<"_storage"> | undefined>(coverImageId);
  const [draftSupporterTarget, setDraftSupporterTarget] = useState<string>(
    supporterTarget?.toString() ?? ""
  );
  const [draftVisibility, setDraftVisibility] = useState<"public" | "unlisted">(
    (visibility as any) ?? "public"
  );
  const [draftTargetValue, setDraftTargetValue] = useState<string>(
    targetValue?.toString() ?? ""
  );
  const [draftStartValue, setDraftStartValue] = useState<string>(
    startValue?.toString() ?? ""
  );
  const [draftUnit, setDraftUnit] = useState<string>(unit ?? "");
  const [draftDirection, setDraftDirection] = useState<"increase" | "decrease">(
    direction ?? "increase"
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Delete-goal confirmation state
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canEditTargetFields = progressType !== "milestones" && progressType !== "streak";

  const onUploadCover = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      setDraftCover(storageId as Id<"_storage">);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const onSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const parsedSupTarget = draftSupporterTarget
        ? parseInt(draftSupporterTarget, 10)
        : undefined;
      const parsedTargetValue = canEditTargetFields && draftTargetValue !== ""
        ? parseFloat(draftTargetValue)
        : undefined;
      const parsedStartValue = canEditTargetFields && draftStartValue !== ""
        ? parseFloat(draftStartValue)
        : undefined;
      await updateGoal({
        goalId,
        title: draftTitle,
        summary: draftSummary || undefined,
        story: draftStory,
        coverImageId: draftCover,
        supporterTarget: parsedSupTarget,
        visibility: draftVisibility,
        targetValue: parsedTargetValue,
        startValue: parsedStartValue,
        unit: canEditTargetFields && draftUnit !== "" ? draftUnit : undefined,
        direction: canEditTargetFields ? draftDirection : undefined,
      });
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setErr(null);
    try {
      await removeGoal({ goalId });
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  const startEditing = () => {
    setDraftTitle(title);
    setDraftSummary(summary ?? "");
    setDraftStory(story ?? "");
    setDraftCover(coverImageId);
    setDraftSupporterTarget(supporterTarget?.toString() ?? "");
    setDraftVisibility((visibility as any) ?? "public");
    setDraftTargetValue(targetValue?.toString() ?? "");
    setDraftStartValue(startValue?.toString() ?? "");
    setDraftUnit(unit ?? "");
    setDraftDirection(direction ?? "increase");
    setEditing(true);
  };

  const currentCoverUrl =
    preview ??
    (draftCover ? coverUrl?.[draftCover] : null) ??
    (coverImageId ? coverUrl?.[coverImageId] : null);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Public page
        </h2>
        {!editing ? (
          <button
            onClick={startEditing}
            className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setPreview(null);
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy || !draftTitle.trim()}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          Cover photo
        </label>
        <div
          onClick={() => editing && fileInput.current?.click()}
          className={`relative aspect-[3/1] w-full overflow-hidden rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] ${
            editing ? "cursor-pointer transition hover:border-[var(--color-accent)]" : ""
          }`}
        >
          {currentCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentCoverUrl}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-dim)]">
              {editing ? "Click to upload a cover photo" : "No cover photo yet"}
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) {
              if (preview) URL.revokeObjectURL(preview);
              setPreview(URL.createObjectURL(f));
              onUploadCover(f);
            }
          }}
        />
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          Title
        </label>
        {editing ? (
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        ) : (
          <p className="text-sm text-[var(--color-text)]">{title}</p>
        )}
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          One-line pitch
        </label>
        {editing ? (
          <input
            value={draftSummary}
            onChange={(e) => setDraftSummary(e.target.value)}
            placeholder="Short, punchy summary for the homepage card"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">{summary || "—"}</p>
        )}
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          Why this matters
        </label>
        {editing ? (
          <textarea
            value={draftStory}
            onChange={(e) => setDraftStory(e.target.value)}
            rows={5}
            placeholder="Tell your story. Why this goal? What does hitting it mean?"
            className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
            {story || "—"}
          </p>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
            Supporter target
          </label>
          {editing ? (
            <input
              type="number"
              value={draftSupporterTarget}
              onChange={(e) => setDraftSupporterTarget(e.target.value)}
              placeholder="e.g. 50"
              min={0}
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          ) : (
            <p className="text-sm text-[var(--color-text)]">
              {supporterTarget ?? <span className="text-[var(--color-text-dim)]">not set</span>}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
            Visibility
          </label>
          {editing ? (
            <select
              value={draftVisibility}
              onChange={(e) => setDraftVisibility(e.target.value as any)}
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
            >
              <option value="public">Public (indexed)</option>
              <option value="unlisted">Unlisted (link only)</option>
            </select>
          ) : (
            <p className="text-sm text-[var(--color-text)] capitalize">{visibility}</p>
          )}
        </div>
      </div>

      {canEditTargetFields && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Target value
            </label>
            {editing ? (
              <input
                type="number"
                step="any"
                value={draftTargetValue}
                onChange={(e) => setDraftTargetValue(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            ) : (
              <p className="text-sm text-[var(--color-text)]">
                {targetValue ?? <span className="text-[var(--color-text-dim)]">—</span>}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Start value
            </label>
            {editing ? (
              <input
                type="number"
                step="any"
                value={draftStartValue}
                onChange={(e) => setDraftStartValue(e.target.value)}
                placeholder="e.g. 0"
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            ) : (
              <p className="text-sm text-[var(--color-text)]">
                {startValue ?? <span className="text-[var(--color-text-dim)]">0</span>}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Unit
            </label>
            {editing ? (
              <input
                type="text"
                value={draftUnit}
                onChange={(e) => setDraftUnit(e.target.value)}
                placeholder="e.g. kg, books, runs"
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            ) : (
              <p className="text-sm text-[var(--color-text)]">
                {unit || <span className="text-[var(--color-text-dim)]">—</span>}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Direction
            </label>
            {editing ? (
              <select
                value={draftDirection}
                onChange={(e) => setDraftDirection(e.target.value as "increase" | "decrease")}
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            ) : (
              <p className="text-sm text-[var(--color-text)] capitalize">
                {direction ?? "increase"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete goal */}
      <div className="mt-6 border-t border-[var(--color-border)] pt-5">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/60 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={12} />
            Delete goal
          </button>
        ) : (
          <div className="rounded-xl border border-red-300/60 bg-red-50/50 p-4">
            <p className="text-sm font-medium text-red-700">
              Delete this goal? This cannot be undone.
            </p>
            <p className="mt-1 text-xs text-red-600/80">
              Type the goal title to confirm:
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={title}
              className="mt-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:border-red-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting || deleteConfirmText.trim() !== title.trim()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={12} className="mr-1 inline" />
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        )}
      </div>

      {err && <p className="mt-3 text-xs text-[var(--color-danger)]">{err}</p>}
    </motion.section>
  );
}
