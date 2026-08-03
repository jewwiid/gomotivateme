"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
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
  Lock as LockIcon,
  BarChart3,
  Flame,
  ListChecks,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { MotivationCircleManager } from "@/components/MotivationCircleManager";
import { ApplicationQueue } from "@/components/ApplicationQueue";
import { UpdateCard } from "@/components/UpdateCard";
import { MilestonesList } from "@/components/MilestonesList";
import {
  OwnerGoalWorkspace,
  type OwnerUpdateKind,
} from "@/components/OwnerGoalWorkspace";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { getDefaultMilestones } from "@/lib/categories";
import { prepareProgressImage } from "@/lib/media";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  AiAssistButton,
  AiDraftCard,
  AiDraftDisclosure,
} from "@/components/AiAssist";
import {
  aiAssistantErrorMessage,
  type AiSuggestion,
} from "@/lib/aiAssistant";

export default function GoalDetailPage() {
  const searchParams = useSearchParams();
  const showDesignPreview =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("designPreview") === "1";

  if (showDesignPreview) {
    return <GoalDetailDesignPreview />;
  }

  return (
    <RequireAuth>
      <GoalDetailContent />
    </RequireAuth>
  );
}

function GoalDetailDesignPreview() {
  const [copied, setCopied] = useState(false);
  const [updates, setUpdates] = useState<any[]>([
    {
      _id: "preview-update-1",
      type: "note",
      note: "Defined the MVP and shared the first feature set.",
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      _id: "preview-update-2",
      type: "milestone",
      note: "Research complete — seven interviews captured.",
      createdAt: Date.now() - 20 * 60 * 60 * 1000,
    },
  ]);
  const publicUrl = "/o/jude/launch-gomotivateme";
  const previewGoal = {
    title: "Launch GoMotivateMe",
    summary:
      "Building a platform where people put their goals on the line: public, accountable, supported.",
    category: "Creative",
    status: "active",
    currentValue: 1,
    targetValue: 4,
    supporterCount: 1,
    coreMotivatorMin: 6,
    milestones: [
      { id: "research", title: "Research", done: true },
      { id: "plan", title: "Plan", done: false },
      { id: "execute", title: "Execute", done: false },
      { id: "complete", title: "Complete", done: false },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header previewUser={{ name: "Jude Okun", handle: "jude" }} />
      <OwnerGoalWorkspace
        goal={previewGoal}
        coverUrl="/illustrations/hero-community-v3.webp"
        owner={{ name: "Jude Okun" }}
        progress={25}
        publicUrl={publicUrl}
        linkCopied={copied}
        updates={updates}
        supporters={[
          {
            _id: "preview-supporter",
            supportType: "encourage",
            pledge: "Regular check-ins",
            createdAt: Date.now() - 9 * 60 * 60 * 1000,
          },
        ]}
        motivators={[]}
        supporterName="Jewel Cage"
        onCopyLink={() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        onOpenUpdate={(kind) => {
          document
            .querySelector<HTMLTextAreaElement>('textarea[placeholder="What progress have you made?"]')
            ?.focus();
          if (kind === "milestone") {
            document.getElementById("milestones")?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        onPostUpdate={async (note) => {
          setUpdates((current) => [
            {
              _id: `preview-update-${Date.now()}`,
              type: "note",
              note,
              createdAt: Date.now(),
            },
            ...current,
          ]);
        }}
      />
    </div>
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

  const { user } = useCurrentUser();
  const goal = useQuery(api.goals.getMine, { goalId });
  const updates = useQuery(api.updates.listForOwner, { goalId });
  const supporters = useQuery(api.supporters.listForOwner, { goalId });
  const supportMessages = useQuery(api.supportMessages.listForOwner, { goalId });
  const motivators = useQuery(api.motivation.listActiveMotivators, { goalId });
  const addUpdate = useMutation(api.updates.add);
  const quickIncrement = useMutation(api.goals.quickIncrement);
  const undoUpdate = useMutation(api.updates.undoUpdate);
  const coverImageUrls = useQuery(
    api.storage.getUrls,
    goal?.coverImageId ? { ids: [goal.coverImageId] } : "skip"
  );

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

  const publicUrl = useMemo(() => {
    if (!goal) return "";
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    return `${base}/o/${goal.ownerHandle ?? ""}/${goal.slug}`;
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

  const postQuickUpdate = async (note: string) => {
    await addUpdate({ goalId, type: "note", note });
  };

  if (goal === undefined) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Header />
        <main className="shell-app px-5 py-12 sm:px-8">
          <div className="h-40 animate-pulse rounded-[1rem] bg-[var(--color-bg-elev)]" />
        </main>
      </div>
    );
  }
  if (goal === null) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
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
  const ownerName = user?.name ?? user?.handle ?? goal.ownerName ?? "Goal owner";
  const coverUrl = goal.coverImageId
    ? coverImageUrls?.[goal.coverImageId] ?? undefined
    : null;
  const supporterName =
    motivators?.[0]?.user?.displayName ??
    motivators?.[0]?.user?.name ??
    undefined;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />

      {goal.moderationStatus && goal.moderationStatus !== "approved" ? (
        <div className="shell-app mt-4 px-4 sm:px-6">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              goal.moderationStatus === "rejected"
                ? "border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]"
                : "border-[var(--color-gold-soft)] bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]"
            }`}
          >
            <span className="font-semibold">
              {goal.moderationStatus === "pending"
                ? "Your goal is being checked."
                : goal.moderationStatus === "review"
                ? "Your goal needs a safety review."
                : "Your goal is not public."}
            </span>{" "}
            {goal.moderationReason ?? "Only you can see it until this is resolved."}
          </div>
        </div>
      ) : null}

      <OwnerGoalWorkspace
        goal={goal}
        coverUrl={coverUrl}
        owner={{ name: ownerName, image: user?.image ?? null }}
        progress={progress}
        publicUrl={publicUrl}
        linkCopied={linkCopied}
        updates={updates}
        supporters={supporters}
        motivators={motivators}
        supporterName={supporterName}
        onCopyLink={onCopyLink}
        onOpenUpdate={(kind: OwnerUpdateKind) => setShowUpdate(kind)}
        onPostUpdate={postQuickUpdate}
        onQuickIncrement={async (delta) => { await quickIncrement({ goalId, delta }); }}
        onUndoUpdate={(updateId) => {
          const reason = prompt("Why are you undoing this? (optional)");
          if (reason === null) return; // user cancelled
          void undoUpdate({ updateId: updateId as Id<"updates">, reason: reason || undefined });
        }}
        milestoneEditor={
          goal.progressType === "milestones" ? (
            <div className="workspace-card p-5">
              <MilestonesList
                goalId={goalId}
                milestones={goal.milestones ?? []}
                isOwner={true}
                currentValue={goal.currentValue ?? 0}
                targetValue={goal.targetValue ?? 0}
                unit={goal.unit}
                embedded
              />
            </div>
          ) : undefined
        }
        updatesArchive={
          <div className="workspace-card p-5">
            <h2 className="text-lg font-bold text-[var(--color-text)]">All updates</h2>
            {updates === undefined ? (
              <div className="mt-4 h-32 animate-pulse rounded-2xl bg-[var(--color-bg-elev)]" />
            ) : updates.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border-strong)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                No updates yet. Share what moved forward to start the timeline.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {updates.map((update: any, index: number) => (
                  <UpdateCard
                    key={update._id}
                    update={update}
                    imageUrl={update.imageId ? updateImageUrlOf(update.imageId) : null}
                    imageUrlOf={updateImageUrlOf}
                    unit={goal.unit}
                    direction={goal.direction}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        }
        supporterInbox={
          supporters && supporters.length > 0 ? (
            <SupporterInbox
              supporters={supporters}
              supportMessages={supportMessages ?? []}
            />
          ) : undefined
        }
        circleManager={
          <MotivationCircleManager
            goalId={goalId}
            goalStatus={goal.status}
            coreMotivatorMin={goal.coreMotivatorMin ?? 3}
            preLaunchDeadline={goal.preLaunchDeadline}
          />
        }
        applicationQueue={
          goal.publicMotivatorPolicy !== "disabled" ? (
            <ApplicationQueue goalId={goalId} />
          ) : undefined
        }
        settingsPanel={
          <>
            <div className="workspace-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">Goal status</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill status={goal.status} />
                  {goal.status === "paused" && goal.pausedReason ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {goal.pausedReason}
                    </span>
                  ) : null}
                </div>
              </div>
              {goal.status !== "completed" && goal.status !== "closed" ? (
                <button
                  type="button"
                  onClick={() => setShowStatus(true)}
                  className="workspace-button-secondary w-auto px-5"
                >
                  {goal.status === "paused" ? (
                    <PlayCircle size={15} aria-hidden />
                  ) : (
                    <PauseCircle size={15} aria-hidden />
                  )}
                  {goal.status === "paused" ? "Resume goal" : "Pause or complete"}
                </button>
              ) : null}
            </div>
            <GoalSettings
              goalId={goalId}
              title={goal.title}
              summary={goal.summary}
              story={goal.story}
              coverImageId={goal.coverImageId}
              supporterTarget={goal.supporterTarget}
              supportTypes={goal.supportTypes ?? []}
              visibility={goal.visibility}
              isAnonymous={goal.isAnonymous}
              targetValue={goal.targetValue}
              startValue={goal.startValue}
              unit={goal.unit}
              direction={goal.direction}
              progressType={goal.progressType}
              category={goal.category}
              supporterCount={goal.supporterCount ?? 0}
              currentValue={goal.currentValue ?? 0}
              onDeleted={() => router.push("/dashboard")}
            />
          </>
        }
      />

      <AnimatePresence>
        {showStatus ? (
          <StatusModal
            goalId={goalId}
            currentStatus={goal.status}
            onClose={() => setShowStatus(false)}
          />
        ) : null}
        {showUpdate ? (
          <UpdateModal
            type={showUpdate}
            goalId={goalId}
            goalTitle={goal.title}
            unit={goal.unit}
            milestones={goal.milestones ?? []}
            onClose={() => setShowUpdate(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Active", color: "bg-[var(--color-success-soft)] text-[var(--color-success-text)] border-[var(--color-success)]", icon: PlayCircle },
    paused: { label: "Paused", color: "bg-[var(--color-warning)] 500/15 text-[var(--color-warning)] 400 border-[var(--color-warning)] 500/30", icon: Pause },
    completed: { label: "Completed", color: "bg-[var(--color-success-soft)] text-[var(--color-success-text)] border-[var(--color-success)]", icon: CheckCircle2 },
    closed: { label: "Closed", color: "bg-[var(--color-text-dim)] text-[var(--color-text-dim)] border-[var(--color-border-strong)]", icon: Archive },
    draft: { label: "Draft", color: "bg-[var(--color-text-dim)] text-[var(--color-text-dim)] border-[var(--color-border-strong)]", icon: Archive },
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
        className="w-full max-w-md workspace-card p-5"
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
            className="w-full rounded-xl border border-[var(--color-success)] bg-[var(--color-success-soft)] p-3 text-left text-sm font-medium transition hover:bg-[var(--color-success-soft)] disabled:opacity-50"
          >
            <PlayCircle size={14} className="mr-2 inline text-[var(--color-success-text)]" />
            Resume the campaign
          </button>
        ) : currentStatus === "completed" ? (
          <p className="text-sm text-[var(--color-text-muted)]">This campaign is complete.</p>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => transition("paused", reason || "Taking a break")}
              disabled={busy}
              className="w-full workspace-card-soft p-3 text-left text-sm font-medium transition hover:border-[var(--color-warning)] 500/40 disabled:opacity-50"
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
              className="w-full rounded-xl border border-[var(--color-success)] bg-[var(--color-success-soft)] p-3 text-left text-sm font-medium transition hover:bg-[var(--color-success-soft)] disabled:opacity-50"
            >
              <CheckCircle2 size={14} className="mr-2 inline text-[var(--color-success-text)]" />
              Mark as completed
            </button>
            <button
              onClick={() => transition("closed")}
              disabled={busy}
              className="w-full workspace-card-soft p-3 text-left text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-text-muted)] disabled:opacity-50"
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

function SupporterInbox({
  supporters,
  supportMessages,
}: {
  supporters: any[];
  supportMessages: any[];
}) {
  const hideMessage = useMutation(api.supportMessages.hide);
  const removeMessage = useMutation(api.supportMessages.remove);
  const [showAll, setShowAll] = useState(false);
  const [moderatingMessageId, setModeratingMessageId] = useState<string | null>(
    null
  );

  return (
    <div className="workspace-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">Supporter inbox</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Encouragement and check-ins from the people behind this goal.
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
          {supporters.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {(showAll ? supporters : supporters.slice(0, 6)).map((supporter: any) => {
          const message = supportMessages.find(
            (item: any) =>
              item.authorId === supporter.userId && !item.hiddenAt
          );
          return (
            <div
              key={supporter._id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-[var(--color-text)]">
                  {supportTypeLabel(supporter.supportType)}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {relativeTime(supporter.createdAt)}
                </span>
              </div>
              {supporter.pledge ? (
                <p className="mt-2 text-sm italic leading-5 text-[var(--color-text-muted)]">
                  “{supporter.pledge}”
                </p>
              ) : null}
              {message ? (
                <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                  <p className="text-sm leading-6 text-[var(--color-text)]">
                    {message.body}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {moderatingMessageId === message._id ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await hideMessage({ messageId: message._id });
                            setModeratingMessageId(null);
                          }}
                          className="font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          Confirm hide
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeMessage({ messageId: message._id });
                            setModeratingMessageId(null);
                          }}
                          className="font-bold text-[var(--color-danger)]"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeratingMessageId(null)}
                          className="text-[var(--color-text-muted)]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setModeratingMessageId(message._id)}
                          className="font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          Hide
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeratingMessageId(message._id)}
                          className="font-bold text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {supporters.length > 6 ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-4 min-h-11 text-sm font-bold text-[var(--color-primary)]"
        >
          {showAll ? "Show fewer" : `Show all ${supporters.length} supporters`}
        </button>
      ) : null}
    </div>
  );
}

function UpdateModal({
  type,
  goalId,
  goalTitle,
  unit,
  milestones,
  onClose,
}: {
  type: "note" | "media" | "link" | "value" | "milestone" | "streak";
  goalId: Id<"goals">;
  goalTitle: string;
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
        className="w-full max-w-md workspace-card p-5"
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
        {type === "note" && (
          <NoteForm goalId={goalId} goalTitle={goalTitle} onDone={onClose} />
        )}
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

function NoteForm({
  goalId,
  goalTitle,
  onDone,
}: {
  goalId: Id<"goals">;
  goalTitle: string;
  onDone: () => void;
}) {
  const add = useMutation(api.updates.add);
  const suggest = useAction(api.aiAssistant.suggest);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const polishUpdate = async () => {
    setAiBusy(true);
    setAiSuggestion(null);
    setAiError(null);
    try {
      const result = await suggest({
        task: "rewriteUpdate",
        draft: {
          title: goalTitle,
          updateText: text.trim(),
        },
      });
      setAiSuggestion(result);
    } catch (error) {
      setAiError(aiAssistantErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  };

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
        onChange={(e) => {
          setText(e.target.value);
          setAiSuggestion(null);
          setAiError(null);
        }}
        maxLength={2000}
        rows={4}
        required
        placeholder="What happened today?"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div>
        <AiAssistButton
          label="Polish with AI"
          busyLabel="Polishing…"
          busy={aiBusy}
          disabled={busy || !text.trim()}
          onClick={polishUpdate}
        />
        <AiDraftDisclosure />
        {aiError ? (
          <p className="mt-3 text-sm text-[var(--color-danger)]">{aiError}</p>
        ) : null}
        {aiSuggestion?.task === "rewriteUpdate" &&
        aiSuggestion.updateText ? (
          <AiDraftCard
            rationale={aiSuggestion.rationale}
            onApply={() => {
              setText(aiSuggestion.updateText ?? text);
              setAiSuggestion(null);
            }}
            onDismiss={() => setAiSuggestion(null)}
            applyLabel="Use polished update"
          >
            <p className="whitespace-pre-wrap">{aiSuggestion.updateText}</p>
          </AiDraftCard>
        ) : null}
      </div>
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
          // Send the browser's UTC offset so "already logged today" is
          // evaluated against the user's day, not the server's.
          await logStreakDay({
            goalId,
            note: note || undefined,
            tzOffsetMinutes: new Date().getTimezoneOffset(),
          });
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
            className="w-full workspace-card-soft p-3 text-left text-sm font-medium transition hover:border-[var(--color-success)] disabled:opacity-50"
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
  isAnonymous,
  targetValue,
  startValue,
  unit,
  direction,
  progressType,
  category,
  supporterCount,
  currentValue,
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
  isAnonymous?: boolean;
  targetValue?: number;
  startValue?: number;
  unit?: string;
  direction?: "increase" | "decrease";
  progressType?: string;
  category?: string;
  supporterCount: number;
  currentValue: number;
  onDeleted: () => void;
}) {
  const updateGoal = useMutation(api.goals.update);
  const changeProgressType = useMutation(api.goals.changeProgressType);
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
  const [draftIsAnonymous, setDraftIsAnonymous] = useState<boolean>(
    Boolean(isAnonymous)
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
  const hasTraction = supporterCount > 0 || currentValue !== (startValue ?? 0);
  const targetFieldsLocked = canEditTargetFields && hasTraction;

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
      const parsedTargetValue = canEditTargetFields && !targetFieldsLocked && draftTargetValue !== ""
        ? parseFloat(draftTargetValue)
        : undefined;
      const parsedStartValue = canEditTargetFields && !targetFieldsLocked && draftStartValue !== ""
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
        isAnonymous: draftIsAnonymous,
        targetValue: parsedTargetValue,
        startValue: parsedStartValue,
        unit: canEditTargetFields && !targetFieldsLocked && draftUnit !== "" ? draftUnit : undefined,
        direction: canEditTargetFields && !targetFieldsLocked ? draftDirection : undefined,
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
    setDraftIsAnonymous(Boolean(isAnonymous));
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
      className="mt-6 workspace-card p-5"
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
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
            Anonymous
          </label>
          {editing ? (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draftIsAnonymous}
                onChange={(e) => setDraftIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text)]">
                Hide my name, avatar, and profile link
              </span>
            </label>
          ) : (
            <p className="text-sm text-[var(--color-text)]">
              {isAnonymous ? "Yes (name hidden)" : "No"}
            </p>
          )}
        </div>
      </div>

      {/* Progress type switcher — only when goal has no traction */}
      <ProgressTypeSwitcher
        goalId={goalId}
        currentType={progressType ?? "number"}
        hasTraction={hasTraction}
        supporterCount={supporterCount}
        changeProgressType={changeProgressType}
        editing={editing}
        category={category ?? "personal"}
      />

      {canEditTargetFields && (
        <div className="mb-3">
          {targetFieldsLocked && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-[var(--color-gold-soft)] bg-[var(--color-gold-soft)] px-3 py-2 text-xs text-[var(--color-gold-text)]">
              <LockIcon size={12} className="mt-0.5 shrink-0" />
              <span>
                Target value, start value, unit, and direction are locked because this goal
                {supporterCount > 0 ? ` has ${supporterCount} supporter${supporterCount === 1 ? "" : "s"}` : " has logged progress"}.
                Close this goal and create a new one to change these.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
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
                  disabled={targetFieldsLocked}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={targetFieldsLocked}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={targetFieldsLocked}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={targetFieldsLocked}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      )}

      {/* Delete goal */}
      <div className="mt-6 border-t border-[var(--color-border)] pt-5">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-danger)] px-4 py-2 text-xs font-semibold text-[var(--color-danger-text)] transition hover:bg-[var(--color-danger-soft)]"
          >
            <Trash2 size={12} />
            Delete goal
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="text-sm font-medium text-[var(--color-danger-text)]">
              Delete this goal? This cannot be undone.
            </p>
            <p className="mt-1 text-xs text-[var(--color-danger-text)]">
              Type the goal title to confirm:
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={title}
              className="mt-2 w-full rounded-lg border border-[var(--color-danger)] bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-danger)] focus:outline-none"
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
                className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-danger)] disabled:opacity-50"
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

/**
 * Progress type switcher — lets the owner change a goal from number → milestones
 * → streak (or vice versa). Only available when the goal has no traction.
 */
function ProgressTypeSwitcher({
  goalId,
  currentType,
  hasTraction,
  supporterCount,
  changeProgressType,
  editing,
  category,
}: {
  goalId: Id<"goals">;
  currentType: string;
  hasTraction: boolean;
  supporterCount: number;
  changeProgressType: any;
  editing: boolean;
  category: string;
}) {
  const [selectedType, setSelectedType] = useState(currentType);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync when goal data refreshes
  useEffect(() => {
    setSelectedType(currentType);
  }, [currentType]);

  if (!editing) {
    return (
      <div className="mb-3">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          Progress type
        </span>
        <p className="text-sm text-[var(--color-text)] capitalize">
          {currentType === "number" ? "Number target" : currentType === "streak" ? "Daily streak" : "Milestone checklist"}
        </p>
      </div>
    );
  }

  if (hasTraction) {
    return (
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
          Progress type
        </span>
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          <LockIcon size={12} className="mt-0.5 shrink-0" />
          <span>
            Tracking method is locked because this goal
            {supporterCount > 0
              ? ` has ${supporterCount} supporter${supporterCount === 1 ? "" : "s"}`
              : " has logged progress"}.
            Close this goal and create a new one to change it.
          </span>
        </div>
      </div>
    );
  }

  const TYPES = [
    { id: "number", label: "Number target", icon: BarChart3 },
    { id: "streak", label: "Daily streak", icon: Flame },
    { id: "milestones", label: "Milestone checklist", icon: ListChecks },
  ] as const;

  const onApply = async () => {
    if (selectedType === currentType) return;
    setBusy(true);
    setErr(null);
    try {
      await changeProgressType({
        goalId,
        progressType: selectedType,
        // Seed default milestones when switching to milestones type
        milestones:
          selectedType === "milestones"
            ? getDefaultMilestones(category)
            : undefined,
        // Defaults for number type — server coerces for milestones/streak
        startValue: 0,
        targetValue: 100,
        unit: "units",
        direction: "increase",
      });
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't change progress type");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3">
      <span className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
        Progress type
      </span>
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = selectedType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <Icon size={18} />
              <span className="text-[11px] font-medium leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
      {selectedType !== currentType && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {busy ? "Changing…" : `Switch to ${selectedType}`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedType(currentType)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          {err && <span className="text-xs text-[var(--color-danger)]">{err}</span>}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-[var(--color-text-dim)]">
        {selectedType === "milestones" && "We'll set up default milestones you can edit."}
        {selectedType === "streak" && "Tracks consecutive days of progress."}
        {selectedType === "number" && "Track a measurable target (start → goal)."}
      </p>
    </div>
  );
}
