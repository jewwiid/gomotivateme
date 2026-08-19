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
  Eye,
  Image as ImageIcon,
  Pause,
  PauseCircle,
  PlayCircle,
  Plus,
  Send,
  Trash2,
  Trophy,
  X,
  CheckCircle2,
  Archive,
  Lock as LockIcon,
  BarChart3,
  Flame,
  ListChecks,
  Loader2,
  Pencil,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { MotivationCircleManager } from "@/components/MotivationCircleManager";
import { ApplicationQueue } from "@/components/ApplicationQueue";
import { GoalMomentumCoach } from "@/components/GoalMomentumCoach";
import { UpdateCard } from "@/components/UpdateCard";
import { MilestonesList } from "@/components/MilestonesList";
import {
  OwnerGoalWorkspace,
  titleCase,
  type OwnerUpdateKind,
} from "@/components/OwnerGoalWorkspace";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { getDefaultMilestones } from "@/lib/categories";
import { getMeasurementsForCategory } from "@/lib/goalMeasurementCatalog";
import { prepareProgressImage } from "@/lib/media";
import { RequireAuth } from "@/components/RequireAuth";
import { AiblWordmark } from "@/components/AiblMark";
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
import { trackDataFastGoal } from "@/lib/analytics";

function targetDateInputValue(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function AiblSyncCard({ goalId }: { goalId: Id<"goals"> }) {
  const map = useQuery(api.partner.getMapForGoal, { goalId });
  const pushGoal = useAction(api.partnerPush.pushGoalToAibl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (map === undefined) return null;
  if (!map?.connected) {
    return (
      <section className="workspace-card p-4">
        <AiblWordmark className="text-sm" />
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
          Connect from AI Boss Leader → Profile. AIBL is invite-only; you cannot sign up from here.
        </p>
      </section>
    );
  }

  return (
      <section className="workspace-card p-4">
        <AiblWordmark className="text-sm" />
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {map.partnerCampaignId
          ? "This goal is linked. Updates and milestones sync as tasks."
          : "Create a matching campaign and tasks in AI Boss Leader."}
      </p>
      {message && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{message}</p>
      )}
      <button
        type="button"
        disabled={busy || !map.canPush}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const result = await pushGoal({ goalId });
            setMessage(`Synced ${result.taskCount} tasks into AI Boss Leader.`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not sync");
          } finally {
            setBusy(false);
          }
        }}
        className="workspace-button-primary mt-3 min-h-9 disabled:opacity-50"
      >
        {busy ? "Syncing…" : map.partnerCampaignId ? "Sync again" : "Create campaign in AIBL"}
      </button>
      {!map.canPush && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Reconnect from AIBL Profile so GoMotivateMe can push campaigns back.
        </p>
      )}
    </section>
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
      note: "Research complete. Seven interviews captured.",
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
        coverUrl="/illustrations/journey/move.webp"
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

  const [showUpdate, setShowUpdate] = useState<OwnerUpdateKind | null>(null);
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
  const firstIncomplete = (goal.milestones ?? []).find((milestone: any) => !milestone.done);
  const streakOffset = goal.streakTimezoneOffsetMinutes ?? new Date().getTimezoneOffset();
  const streakTodayKey = new Date(Date.now() - streakOffset * 60_000)
    .toISOString()
    .slice(0, 10);
  const streakLoggedToday = goal.streakLastLoggedDay === streakTodayKey;
  const nextUpdateKind: OwnerUpdateKind =
    goal.progressType === "milestones"
      ? "milestone"
      : goal.progressType === "streak"
      ? "streak"
      : "progress";
  const fallbackAction =
    goal.progressType === "milestones" && firstIncomplete?.title
      ? `Define your ${firstIncomplete.title.toLowerCase()}`
      : goal.progressType === "streak"
      ? streakLoggedToday
        ? "Today's streak is safe"
        : "Mark today's progress"
      : goal.progressType === "number"
      ? `Log your ${goal.unit ?? "progress"}`
      : "Share what you learned";
  const fallbackReason =
    goal.progressType === "milestones"
      ? "Clarify the outcome, success metrics, and the next concrete step."
      : goal.progressType === "streak"
      ? streakLoggedToday
        ? "You showed up today. Come back tomorrow to keep the chain going."
        : "Keep your streak alive. Log today and stay on track."
      : "Update your progress and keep your supporters in the loop.";
  const lastActivityAt = Math.max(
    goal.launchedAt ?? goal.createdAt,
    ...(updates ?? []).filter((update: any) => !update.revertedAt).map((update: any) => update.createdAt)
  );
  const staleDays = Math.max(0, Math.floor((Date.now() - lastActivityAt) / 86_400_000));

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
        progress={progress}
        publicUrl={publicUrl}
        linkCopied={linkCopied}
        updates={updates}
        supporters={supporters}
        motivators={motivators}
        supporterName={supporterName}
        nextActionPanel={
          <GoalMomentumCoach
            goalId={goalId}
            fallbackAction={fallbackAction}
            fallbackReason={fallbackReason}
            updateKind={nextUpdateKind}
            updateDisabled={goal.progressType === "streak" && streakLoggedToday}
            updateLabel={
              goal.progressType === "milestones"
                ? "Create plan"
                : goal.progressType === "streak"
                ? streakLoggedToday
                  ? "Done for today"
                  : "Mark today"
                : "Log progress"
            }
            staleDays={staleDays}
            onOpenUpdate={(kind) => setShowUpdate(kind)}
          />
        }
        partnerPanel={<AiblSyncCard goalId={goalId} />}
        onCopyLink={onCopyLink}
        onOpenUpdate={(kind: OwnerUpdateKind) => setShowUpdate(kind)}
        onPostUpdate={postQuickUpdate}
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
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="workspace-eyebrow">Goal journal</p>
                <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">All updates</h2>
              </div>
              <span className="font-mono text-xs text-[var(--color-text-dim)]">
                {updates?.length ?? 0} entries
              </span>
            </div>
            {updates === undefined ? (
              <div className="mt-4 h-32 animate-pulse rounded-2xl bg-[var(--color-bg-elev)]" />
            ) : updates.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border-strong)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                No updates yet. Share what moved forward to start the timeline.
              </div>
            ) : (
              <div className="mt-4 max-h-[48rem] space-y-2 overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                {updates.map((update: any, index: number) => (
                  <UpdateCard
                    key={update._id}
                    update={update}
                    imageUrl={update.imageId ? updateImageUrlOf(update.imageId) : null}
                    imageUrlOf={updateImageUrlOf}
                    unit={goal.unit}
                    direction={goal.direction}
                    index={index}
                    compact
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
          <div className="grid items-start gap-4 xl:grid-cols-12">
            <div className="workspace-card p-5 xl:col-span-3">
              <div>
                <p className="workspace-eyebrow">Lifecycle</p>
                <p className="mt-1 text-base font-bold text-[var(--color-text)]">Goal status</p>
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
                  className="workspace-button-secondary mt-5 w-full px-4"
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
            <div className="min-w-0 xl:col-span-9">
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
                targetDate={goal.targetDate}
                supporterCount={goal.supporterCount ?? 0}
                currentValue={goal.currentValue ?? 0}
                onDeleted={() => router.push("/dashboard")}
              />
            </div>
          </div>
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
            quickDelta={goal.direction === "decrease" ? -1 : 1}
            onSelectType={setShowUpdate}
            onQuickIncrement={async (note) => {
              await quickIncrement({
                goalId,
                delta: goal.direction === "decrease" ? -1 : 1,
                note: note || undefined,
              });
              trackDataFastGoal("goal_update_posted", { update_type: "quick" });
            }}
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
    paused: { label: "Paused", color: "bg-[var(--color-warning-soft)] text-[var(--color-warning-text)] border-[var(--color-warning)]", icon: Pause },
    completed: { label: "Completed", color: "bg-[var(--color-success-soft)] text-[var(--color-success-text)] border-[var(--color-success)]", icon: CheckCircle2 },
    closed: { label: "Closed", color: "bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]", icon: Archive },
    draft: { label: "Draft", color: "bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]", icon: Archive },
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

function ViewportModal({
  children,
  onClose,
  ariaLabel,
}: {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
}) {
  const [portalReady, setPortalReady] = useState(false);
  const [viewport, setViewport] = useState({ height: 0, offsetTop: 0 });

  useEffect(() => {
    setPortalReady(true);

    const visualViewport = window.visualViewport;
    const syncViewport = () => {
      setViewport({
        height: visualViewport?.height ?? window.innerHeight,
        offsetTop: visualViewport?.offsetTop ?? 0,
      });
    };

    syncViewport();
    visualViewport?.addEventListener("resize", syncViewport);
    visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      visualViewport?.removeEventListener("resize", syncViewport);
      visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!portalReady) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-x-0 z-[100] flex items-center justify-center overflow-hidden bg-black/60 px-3 sm:px-4"
      style={{
        top: viewport.offsetTop,
        height: viewport.height ? `${viewport.height}px` : "100dvh",
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 18, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="workspace-card max-h-full w-full max-w-md overflow-y-auto overscroll-contain p-5"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
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
    <ViewportModal onClose={onClose} ariaLabel="Campaign status">
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
              className="w-full workspace-card-soft p-3 text-left text-sm font-medium transition hover:border-[var(--color-warning)] disabled:opacity-50"
            >
              <Pause size={14} className="mr-2 inline text-[var(--color-warning-text)]" />
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
    </ViewportModal>
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
  quickDelta,
  onSelectType,
  onQuickIncrement,
  onClose,
}: {
  type: OwnerUpdateKind;
  goalId: Id<"goals">;
  goalTitle: string;
  unit: string;
  milestones: any[];
  quickDelta: -1 | 1;
  onSelectType: (type: OwnerUpdateKind) => void;
  onQuickIncrement: (note?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [progressNote, setProgressNote] = useState("");
  const canReturnToProgress = type === "value";
  return (
    <ViewportModal onClose={onClose} ariaLabel="Goal update">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {canReturnToProgress ? (
              <button
                type="button"
                onClick={() => onSelectType("progress")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)] active:translate-y-px"
                aria-label="Back to progress options"
              >
                <ArrowLeft size={16} />
              </button>
            ) : null}
            <h3 className="truncate text-lg font-semibold">
            {type === "progress" && "Log progress"}
            {type === "note" && "Add a note"}
            {type === "media" && "Share progress media"}
            {type === "link" && "Add a link"}
            {type === "value" && `New ${unit} value`}
            {type === "milestone" && "Mark milestone done"}
            {type === "streak" && "Mark today"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {type === "progress" && (
          <ProgressActionPicker
            unit={unit}
            quickDelta={quickDelta}
            note={progressNote}
            onNoteChange={setProgressNote}
            onChoose={onSelectType}
            onQuickIncrement={onQuickIncrement}
            onDone={onClose}
          />
        )}
        {type === "note" && (
          <NoteForm goalId={goalId} goalTitle={goalTitle} onDone={onClose} />
        )}
        {type === "media" && <MediaForm goalId={goalId} onDone={onClose} />}
        {type === "link" && <LinkForm goalId={goalId} onDone={onClose} />}
        {type === "value" && (
          <ValueForm
            goalId={goalId}
            unit={unit}
            initialNote={progressNote}
            onNoteChange={setProgressNote}
            onDone={onClose}
          />
        )}
        {type === "streak" && <StreakForm goalId={goalId} onDone={onClose} />}
        {type === "milestone" && (
          <MilestoneForm goalId={goalId} milestones={milestones} onDone={onClose} />
        )}
    </ViewportModal>
  );
}

function ProgressActionPicker({
  unit,
  quickDelta,
  note,
  onNoteChange,
  onChoose,
  onQuickIncrement,
  onDone,
}: {
  unit: string;
  quickDelta: -1 | 1;
  note: string;
  onNoteChange: (note: string) => void;
  onChoose: (type: OwnerUpdateKind) => void;
  onQuickIncrement: (note?: string) => Promise<void>;
  onDone: () => void;
}) {
  const [incrementing, setIncrementing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const increment = async () => {
    if (incrementing) return;
    setIncrementing(true);
    setError(null);
    try {
      await onQuickIncrement(note.trim() || undefined);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update progress");
    } finally {
      setIncrementing(false);
    }
  };

  return (
    <div>
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">
        Add a note for your supporters, then log a quick adjustment or enter the current value.
      </p>
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="What progress have you made? (optional)"
        className="mt-3 w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={increment}
          disabled={incrementing}
          className="rounded-[var(--workspace-radius)] border border-[var(--color-border-strong)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] active:translate-y-px disabled:opacity-50"
        >
          <Plus size={18} className="text-[var(--color-primary)]" aria-hidden />
          <span className="mt-3 block text-sm font-bold text-[var(--color-text)]">
            {incrementing ? "Updating…" : `Quick ${quickDelta > 0 ? "+1" : "−1"}`}
          </span>
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
            {quickDelta > 0 ? "Add" : "Subtract"} one {unit}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoose("value")}
          className="rounded-[var(--workspace-radius)] border border-[var(--color-border-strong)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] active:translate-y-px"
        >
          <BarChart3 size={18} className="text-[var(--color-primary)]" aria-hidden />
          <span className="mt-3 block text-sm font-bold text-[var(--color-text)]">Enter value</span>
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Set the current {unit}</span>
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
    </div>
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
          trackDataFastGoal("goal_update_posted", { update_type: "note" });
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
          trackDataFastGoal("goal_update_posted", { update_type: "media" });
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
          trackDataFastGoal("goal_update_posted", { update_type: "link" });
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
  initialNote,
  onNoteChange,
  onDone,
}: {
  goalId: Id<"goals">;
  unit: string;
  initialNote?: string;
  onNoteChange?: (note: string) => void;
  onDone: () => void;
}) {
  const recordValue = useMutation(api.goals.recordValue);
  const [value, setValue] = useState("");
  const [note, setNote] = useState(initialNote ?? "");
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
          trackDataFastGoal("goal_update_posted", { update_type: "value" });
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
        onChange={(e) => {
          setNote(e.target.value);
          onNoteChange?.(e.target.value);
        }}
        maxLength={2000}
        rows={3}
        placeholder="What progress have you made? (optional)"
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
          trackDataFastGoal("goal_update_posted", { update_type: "streak" });
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
                trackDataFastGoal("goal_update_posted", { update_type: "milestone" });
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
  targetDate,
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
  targetDate?: number;
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
  const [draftVisibility, setDraftVisibility] = useState<"public" | "unlisted" | "private">(
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
  const targetDateValue = targetDateInputValue(targetDate);
  const [draftTargetDate, setDraftTargetDate] = useState(targetDateValue);
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
      const targetDateChanged = draftTargetDate !== targetDateValue;
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
        targetDate:
          targetDateChanged && draftTargetDate
            ? new Date(`${draftTargetDate}T12:00:00`).getTime()
            : undefined,
        clearTargetDate: targetDateChanged && !draftTargetDate ? true : undefined,
      });
      setPreview(null);
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
    setDraftTargetDate(targetDateValue);
    setEditing(true);
  };

  const currentCoverUrl =
    preview ??
    (draftCover ? coverUrl?.[draftCover] : null) ??
    (coverImageId ? coverUrl?.[coverImageId] : null);
  const progressTypeLabel =
    progressType === "streak"
      ? "Daily streak"
      : progressType === "milestones"
      ? "Milestone checklist"
      : "Number target";
  const visibilityLabel =
    visibility === "public"
      ? "Public"
      : visibility === "unlisted"
      ? "Unlisted"
      : "Private";
  const fieldClass =
    "workspace-input min-h-11 px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="workspace-card overflow-hidden"
    >
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="workspace-eyebrow">Public page</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-[var(--color-text)]">
            How your goal appears
          </h2>
          <p className="mt-1 max-w-[58ch] text-sm leading-6 text-[var(--color-text-muted)]">
            Shape the story people see and decide how they can find it.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="workspace-button-secondary min-h-10 w-auto self-start px-4 sm:self-auto"
          >
            <Pencil size={14} aria-hidden />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPreview(null);
              }}
              className="workspace-button-secondary min-h-10 w-auto px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !draftTitle.trim()}
              className="workspace-button-primary min-h-10 w-auto px-5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={14} aria-hidden />
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </header>

      <div className="px-5 sm:px-6">
        {err ? (
          <p className="mt-5 border-l-2 border-[var(--color-danger)] pl-3 text-sm text-[var(--color-danger-text)]">
            {err}
          </p>
        ) : null}

        {!editing ? (
          <div className="grid gap-6 py-6 lg:grid-cols-12 lg:items-start">
            <figure className="relative overflow-hidden rounded-[var(--workspace-radius)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] lg:col-span-5">
              {currentCoverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentCoverUrl}
                  alt="Goal cover"
                  className="aspect-[4/3] min-h-56 w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] min-h-56 place-items-center">
                  <div className="text-center">
                    <ImageIcon className="mx-auto text-[var(--color-text-dim)]" size={24} aria-hidden />
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">No cover image yet</p>
                  </div>
                </div>
              )}
              <figcaption className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-[var(--color-text)]/80 px-3 py-1 font-mono text-[10px] text-white backdrop-blur-sm">
                Cover image
              </figcaption>
            </figure>

            <article className="min-w-0 lg:col-span-7">
              <p className="workspace-eyebrow">Goal page copy</p>
              <h3 className="mt-2 max-w-[24ch] text-2xl font-bold tracking-[-0.035em] text-[var(--color-text)] sm:text-3xl">
                {title}
              </h3>
              <p className="mt-3 max-w-[62ch] text-base leading-7 text-[var(--color-text-secondary)]">
                {summary || "No one-line pitch has been added yet."}
              </p>
              <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                <p className="workspace-eyebrow">Why this matters</p>
                <p className="mt-2 line-clamp-5 max-w-[72ch] whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-muted)]">
                  {story || "Add the reason behind this goal so people know what they are showing up for."}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--color-border)] pt-5 sm:grid-cols-4">
                <SettingsReadout
                  icon={Calendar}
                  label="Target date"
                  value={targetDate ? formatDate(targetDate) : "Open-ended"}
                />
                <SettingsReadout
                  icon={Users}
                  label="Supporter target"
                  value={supporterTarget ? `${supporterTarget} people` : "No target"}
                />
                <SettingsReadout icon={Eye} label="Visibility" value={visibilityLabel} />
                <SettingsReadout
                  icon={UserRound}
                  label="Identity"
                  value={isAnonymous ? "Anonymous" : "Name shown"}
                />
              </div>

              <section className="mt-5 border-t border-[var(--color-border)] pt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                  <p className="workspace-eyebrow">Progress tracking</p>
                  <h3 className="mt-1 text-base font-bold tracking-[-0.02em] text-[var(--color-text)]">
                    {progressTypeLabel}
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {supportTypes.length
                    ? `Support: ${supportTypes.map(titleCase).join(" · ")}`
                    : "General encouragement"}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 rounded-[var(--workspace-radius-sm)] bg-[var(--color-bg-elev)] sm:grid-cols-4 sm:divide-x sm:divide-[var(--color-border)]">
                <SettingsMetric label="Start" value={formatNumber(startValue ?? 0)} />
                <SettingsMetric label="Current" value={formatNumber(currentValue)} />
                <SettingsMetric label="Target" value={targetValue !== undefined ? formatNumber(targetValue) : "—"} />
                <SettingsMetric label="Unit" value={unit || (progressType === "streak" ? "days" : "steps")} />
              </div>
              </section>
            </article>
          </div>
        ) : (
          <>
            <section className="py-6">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="workspace-eyebrow">Cover image</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">Choose an image that makes the goal immediately understandable.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="group relative block aspect-[16/6] max-h-[25rem] min-h-48 w-full overflow-hidden rounded-[var(--workspace-radius)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-left transition hover:border-[var(--color-primary)] active:translate-y-px sm:aspect-[16/5]"
              >
                {currentCoverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentCoverUrl} alt="Goal cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-center text-sm text-[var(--color-text-muted)]">
                    <span>Upload a cover image</span>
                  </div>
                )}
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-text)] px-3 py-2 text-xs font-bold text-white transition group-hover:bg-[var(--color-primary)]">
                  <ImageIcon size={14} aria-hidden />
                  {currentCoverUrl ? "Replace image" : "Choose image"}
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(URL.createObjectURL(file));
                  void onUploadCover(file);
                }}
              />
            </section>

            <section className="border-t border-[var(--color-border)] py-7">
              <SectionHeading eyebrow="Page copy" title="Tell people what this goal means" />
              <div className="mt-5 grid gap-5">
                <SettingsField label="Title">
                  <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className={fieldClass} />
                </SettingsField>
                <SettingsField label="One-line pitch" helper="Used on your public goal card.">
                  <input
                    value={draftSummary}
                    onChange={(event) => setDraftSummary(event.target.value)}
                    placeholder="A clear, specific summary"
                    className={fieldClass}
                  />
                </SettingsField>
                <SettingsField label="Why this matters" helper="Give supporters the human reason behind the target.">
                  <textarea
                    value={draftStory}
                    onChange={(event) => setDraftStory(event.target.value)}
                    rows={5}
                    placeholder="Why this goal, and what would reaching it change?"
                    className={`${fieldClass} min-h-32 resize-y leading-6`}
                  />
                </SettingsField>
              </div>
            </section>

            <section className="border-t border-[var(--color-border)] py-7">
              <SectionHeading eyebrow="Publishing" title="Control who can see and support it" />
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <SettingsField label="Supporter target" helper="Optional number of people you hope will show up.">
                  <input
                    type="number"
                    value={draftSupporterTarget}
                    onChange={(event) => setDraftSupporterTarget(event.target.value)}
                    placeholder="No target"
                    min={0}
                    className={fieldClass}
                  />
                </SettingsField>
                <SettingsField label="Target date" helper={draftTargetDate ? undefined : "Open-ended goal"}>
                  <input
                    type="date"
                    value={draftTargetDate}
                    onChange={(event) => setDraftTargetDate(event.target.value)}
                    className={fieldClass}
                  />
                  {draftTargetDate ? (
                    <button
                      type="button"
                      onClick={() => setDraftTargetDate("")}
                      className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] active:translate-y-px"
                    >
                      <X size={13} aria-hidden />
                      Remove date
                    </button>
                  ) : null}
                </SettingsField>
                <SettingsField label="Visibility" helper="Private goals are visible only to you.">
                  <select
                    value={draftVisibility}
                    onChange={(event) => setDraftVisibility(event.target.value as "public" | "unlisted" | "private")}
                    className={fieldClass}
                  >
                    <option value="public">Public — searchable</option>
                    <option value="unlisted">Unlisted — link only</option>
                    <option value="private">Private — only me</option>
                  </select>
                </SettingsField>
                <SettingsField label="Identity" helper="Anonymous goals hide your name, avatar, and profile link.">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 border-y border-[var(--color-border)] py-2 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={draftIsAnonymous}
                      onChange={(event) => setDraftIsAnonymous(event.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    Publish this goal anonymously
                  </label>
                </SettingsField>
              </div>
            </section>

            <section className="border-t border-[var(--color-border)] py-7">
              <SectionHeading eyebrow="Progress tracking" title="Define what moving forward means" />
              <div className="mt-5">
                <ProgressTypeSwitcher
                  goalId={goalId}
                  currentType={progressType ?? "number"}
                  hasTraction={hasTraction}
                  supporterCount={supporterCount}
                  changeProgressType={changeProgressType}
                  editing
                  category={category ?? "personal"}
                />
              </div>

              {canEditTargetFields ? (
                <div className="mt-5">
                  {targetFieldsLocked ? (
                    <div className="mb-5 flex items-start gap-3 border-y border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                      <LockIcon size={15} className="mt-1 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
                      <span>
                        These measurement fields are locked because this goal
                        {supporterCount > 0
                          ? ` has ${supporterCount} supporter${supporterCount === 1 ? "" : "s"}`
                          : " has logged progress"}.
                        Close it and create a new goal to change the measurement itself.
                      </span>
                    </div>
                  ) : null}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <SettingsField label="Target value">
                      <input type="number" step="any" value={draftTargetValue} onChange={(event) => setDraftTargetValue(event.target.value)} placeholder="100" disabled={targetFieldsLocked} className={fieldClass} />
                    </SettingsField>
                    <SettingsField label="Start value">
                      <input type="number" step="any" value={draftStartValue} onChange={(event) => setDraftStartValue(event.target.value)} placeholder="0" disabled={targetFieldsLocked} className={fieldClass} />
                    </SettingsField>
                    <SettingsField label="Unit">
                      <input value={draftUnit} onChange={(event) => setDraftUnit(event.target.value)} placeholder="lessons, books, kilometres" disabled={targetFieldsLocked} className={fieldClass} />
                    </SettingsField>
                    <SettingsField label="Direction">
                      <select value={draftDirection} onChange={(event) => setDraftDirection(event.target.value as "increase" | "decrease")} disabled={targetFieldsLocked} className={fieldClass}>
                        <option value="increase">Increase toward the target</option>
                        <option value="decrease">Decrease toward the target</option>
                      </select>
                    </SettingsField>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}

        <section className="border-t border-[var(--color-border)] py-7">
          {!confirmingDelete ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="workspace-eyebrow text-[var(--color-danger-text)]">Danger zone</p>
              <h3 className="mt-1 text-base font-bold text-[var(--color-text)]">Delete this goal</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Permanently removes its progress, updates, and supporter activity.</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-[var(--color-danger)] px-4 text-xs font-bold text-[var(--color-danger-text)] transition hover:bg-[var(--color-danger-soft)] active:translate-y-px"
            >
              <Trash2 size={13} aria-hidden />
              Delete goal
            </button>
          </div>
        ) : (
          <div className="border-l-2 border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4 sm:p-5">
            <p className="text-base font-bold text-[var(--color-danger-text)]">
              Delete this goal? This cannot be undone.
            </p>
            <p className="mt-1 text-sm text-[var(--color-danger-text)]">
              Type the goal title to confirm:
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={title}
              className="workspace-input mt-3 min-h-11 px-3 py-2.5 text-sm focus:border-[var(--color-danger)]"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
                className="workspace-button-secondary min-h-10 w-auto px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || deleteConfirmText.trim() !== title.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-danger)] px-4 text-xs font-bold text-white transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={13} aria-hidden />
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
          )}
        </section>
      </div>
    </motion.section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="workspace-eyebrow">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--color-text)]">{title}</h3>
    </div>
  );
}

function SettingsField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">{label}</span>
      {children}
      {helper ? <span className="mt-1.5 block text-xs leading-5 text-[var(--color-text-dim)]">{helper}</span> : null}
    </div>
  );
}

function SettingsReadout({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={17} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden />
      <div>
        <p className="workspace-eyebrow">{label}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{value}</p>
      </div>
    </div>
  );
}

function SettingsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-4 first:pl-0 sm:px-5 sm:first:pl-0">
      <p className="workspace-eyebrow">{label}</p>
      <p className="mt-1 truncate font-mono text-base font-semibold text-[var(--color-text)]">{value}</p>
    </div>
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

  const currentTypeLabel =
    currentType === "number"
      ? "Number target"
      : currentType === "streak"
      ? "Daily streak"
      : "Milestone checklist";

  if (!editing) {
    return (
      <div>
        <span className="workspace-eyebrow">Progress type</span>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{currentTypeLabel}</p>
      </div>
    );
  }

  if (hasTraction) {
    return (
      <div>
        <p className="workspace-eyebrow">Tracking method</p>
        <div className="mt-2 flex items-center justify-between gap-4 border-y border-[var(--color-border)] py-3">
          <span className="text-sm font-semibold text-[var(--color-text)]">{currentTypeLabel}</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-text-muted)]">
            <LockIcon size={12} aria-hidden />
            Locked
          </span>
        </div>
      </div>
    );
  }

  const allowedProgressTypes = new Set(
    getMeasurementsForCategory(category).map((measurement) => measurement.progressType)
  );
  const TYPES = [
    { id: "number", label: "Number target", icon: BarChart3 },
    { id: "streak", label: "Daily streak", icon: Flame },
    { id: "milestones", label: "Milestone checklist", icon: ListChecks },
  ].filter((type) => allowedProgressTypes.has(type.id as "number" | "streak" | "milestones"));

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
    <div>
      <span className="mb-2 block workspace-eyebrow">
        Progress type
      </span>
      <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = selectedType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={`flex items-center gap-2.5 px-3 py-3 text-left transition active:translate-y-px ${
                active
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-bold leading-tight">{t.label}</span>
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
