"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CircleGauge,
  Flag,
  Heart,
  Home,
  MessageCircle,
  Share2,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ReactionBar } from "@/components/ReactionBar";
import { StructuredSupportComposer } from "@/components/StructuredSupportComposer";
import { SupporterWall } from "@/components/SupporterWall";
import { StorySection } from "@/components/StorySection";
import { HowIWantSupport } from "@/components/HowIWantSupport";
import { RecentActivity } from "@/components/RecentActivity";
import { EditorialTimeline } from "@/components/EditorialTimeline";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ReportButton } from "@/components/ReportButton";
import { MotivationCircleWidget } from "@/components/MotivationCircleWidget";
import { CheckInList } from "@/components/CheckInList";
import { DualProgress } from "@/components/DualProgress";
import { SignInModal } from "@/components/SignInModal";
import { Header } from "@/components/Header";
import {
  Avatar,
  MomentumStat,
  titleCase,
} from "@/components/OwnerGoalWorkspace";
import {
  WorkspaceShell,
  type WorkspaceNavItem,
} from "@/components/WorkspaceShell";
import { displayName, formatDate, formatNumber } from "@/lib/format";

export default function PublicGoalPage() {
  const params = useParams<{ handle: string; slug: string }>();
  const handle = (params.handle as string)?.toLowerCase() ?? "";
  const slug = params.slug as string;
  const goal = useQuery(api.public.getGoalByHandleAndSlug, { handle, slug });

  if (goal === undefined) {
    return (
      <LightShell>
        <LoadingState />
      </LightShell>
    );
  }

  if (goal === null) {
    return (
      <LightShell>
        <div className="py-20 text-center">
          <h1 className="title-state">
            Goal not found
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            This link might be wrong, or the goal is unlisted.
          </p>
          <Link href="/explore" className="workspace-button-primary mx-auto mt-6 w-auto px-5">
            Explore goals
          </Link>
        </div>
      </LightShell>
    );
  }

  return <PublicGoalView goalId={goal._id} goal={goal} />;
}

function PublicGoalView({
  goalId,
  goal,
}: {
  goalId: Id<"goals">;
  goal: any;
}) {
  const { user, isAuthenticated } = useCurrentUser();
  const isOwner = !!user && user._id === goal.ownerId;
  const updatesCount = useQuery(api.updates.countForGoal, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const owner = useQuery(api.users.profilesById, { ids: [goal.ownerId] });
  const motivators = useQuery(api.motivation.listActiveMotivators, { goalId });
  const supporterRows = useQuery(api.supporters.listForGoal, { goalId, limit: 4 });
  const reactionStats = useQuery(api.reactions.publicStats, { goalId });
  const supporterIds = useMemo(
    () => (supporterRows ?? []).map((supporter: any) => supporter.userId),
    [supporterRows]
  );
  const supporterProfiles = useQuery(
    api.users.profilesById,
    supporterIds.length > 0 ? { ids: supporterIds } : "skip"
  );

  const imageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    if (goal.coverImageId) ids.add(goal.coverImageId);
    return Array.from(ids);
  }, [goal.coverImageId]);
  const imageUrls = useQuery(
    api.storage.getUrls,
    imageIds.length > 0 ? { ids: imageIds } : "skip"
  );

  const coverUrl = goal.coverImageId
    ? imageUrls?.[goal.coverImageId as Id<"_storage">] ?? undefined
    : null;
  const ownerName = owner?.[goal.ownerId]?.name ?? goal.ownerName ?? "Someone";
  const ownerImage = owner?.[goal.ownerId]?.image ?? goal.ownerImage ?? null;
  const ownerProfileHref =
    !goal.isAnonymous && goal.ownerHandle
      ? `/@${goal.ownerHandle}`
      : null;
  const supporterCount = goal.supporterCount ?? 0;
  const supporterTarget = goal.supporterTarget ?? null;
  const supporterPreview = (supporterRows ?? [])
    .map((supporter: any) => {
      const profile = supporterProfiles?.[supporter.userId];
      if (!profile) return null;
      return {
        id: String(supporter.userId),
        name: profile.name ?? profile.handle ?? "Supporter",
        image: profile.image ?? null,
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; image: string | null }>;
  const coreMotivators = (motivators ?? []).filter(
    (motivator: any) => motivator.isCoreMotivator
  );
  const milestones = goal.milestones ?? [];
  const firstIncomplete = milestones.find((milestone: any) => !milestone.done);
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const isClosed = goal.status === "closed";
  const isInactive = isPaused || isClosed;
  const goalPct = goal.progress ?? 0;
  const goalLabel =
    goal.progressType === "milestones"
      ? `${goal.currentValue} of ${goal.targetValue} milestones`
      : goal.progressType === "streak"
      ? `${goal.currentValue} day streak`
      : `${formatNumber(goal.currentValue)} of ${formatNumber(goal.targetValue)} ${goal.unit}`;

  const supportSectionRef = useRef<HTMLElement>(null);
  const cheerSectionRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
    } catch {
      // Fall back to copying the link.
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access may be unavailable in embedded browsers.
    }
  };

  const scrollToSupport = () =>
    supportSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  const scrollToCheer = () =>
    cheerSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  const openSupport = () => {
    if (!isAuthenticated) {
      setSignInOpen(true);
      return;
    }
    scrollToSupport();
  };

  const navItems: WorkspaceNavItem[] = [
    { label: "Overview", href: "#overview", icon: Home, active: true },
    { label: "Why it matters", href: "#story", icon: BookOpen },
    ...(goal.progressType === "milestones" && milestones.length > 0
      ? [{ label: "Milestones", href: "#milestones", icon: Flag }]
      : []),
    { label: "Updates", href: "#updates", icon: MessageCircle },
    { label: "Supporters", href: "#supporters", icon: Users },
    { label: "Creator", href: "#creator", icon: UserRound },
  ];

  const supportLabel = isOwner
    ? "Manage this goal"
    : isCompleted
    ? "Celebrate this goal"
    : "Support this goal";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <WorkspaceShell
        items={navItems}
        ariaLabel="Public goal navigation"
      >
        <div id="overview" className="scroll-mt-24 space-y-4">
          <section className="grid min-h-[12rem] gap-6 overflow-hidden rounded-[2rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 md:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_14rem]">
            <div className="relative min-h-52 overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-sunken)] md:min-h-0">
              {coverUrl === undefined ? (
                <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-sunken)]" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl || "/illustrations/journey/move.webp"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center py-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-semibold ${
                    isCompleted
                      ? "rounded-full bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                      : isPaused
                      ? "rounded-full bg-[var(--color-warning-soft)] text-[var(--color-gold-text)]"
                      : "rounded-full bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                  }`}
                >
                  {titleCase(goal.status)}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  {titleCase(goal.category || "Goal")}
                </span>
              </div>
              <h1 className="mt-5 max-w-[18ch] text-balance font-display text-[clamp(2.4rem,4vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
                {goal.title}
              </h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-[var(--color-text-muted)]">
                {goal.summary || "A public goal made stronger by the people behind it."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                {ownerProfileHref ? (
                  <Link
                    href={ownerProfileHref}
                    aria-label={`View ${displayName(ownerName)}'s profile`}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full pr-2 outline-none transition hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:translate-y-px"
                  >
                    <Avatar name={ownerName} image={ownerImage} size="md" />
                    <span className="font-semibold text-[var(--color-text)] underline-offset-4 group-hover:text-[var(--color-primary)] group-hover:underline">
                      {displayName(ownerName)}
                    </span>
                  </Link>
                ) : (
                  <>
                    <Avatar name={ownerName} image={ownerImage} size="md" />
                    <span className="font-semibold text-[var(--color-text)]">{displayName(ownerName)}</span>
                  </>
                )}
                <span aria-hidden>·</span>
                <span>Started {formatDate(goal.createdAt)}</span>
                {goal.targetDate ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Target {formatDate(goal.targetDate)}</span>
                  </>
                ) : null}
              </div>
              <GoalSocialProof
                supporters={supporterPreview}
                supporterCount={supporterCount}
                reactionStats={reactionStats}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:flex xl:flex-col">
              {isOwner ? (
                <Link href={`/dashboard/${goalId}`} className="workspace-button-primary">
                  <span className="sm:hidden">Manage</span>
                  <span className="hidden sm:inline">Manage this goal</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openSupport}
                  className="workspace-button-primary"
                >
                  <Heart size={16} aria-hidden />
                  <span className="sm:hidden">Support</span>
                  <span className="hidden sm:inline">{supportLabel}</span>
                </button>
              )}
              <button type="button" onClick={onShare} className="workspace-button-secondary">
                {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
                {copied ? "Link copied" : "Share goal"}
              </button>
            </div>
          </section>

          {(isPaused || isCompleted || isClosed) && (
            <div
              role="status"
              className={`rounded-[var(--workspace-radius)] border p-3 text-sm ${
                isPaused
                  ? "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]"
                  : isCompleted
                  ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)]"
              }`}
            >
              <strong>
                {isPaused ? "Paused." : isCompleted ? "Completed." : "Closed."}
              </strong>{" "}
              {isPaused
                ? goal.pausedReason ?? "Taking a break."
                : isCompleted
                ? "They hit their target. Leave a final note to celebrate."
                : "This goal is no longer accepting support."}
            </div>
          )}

          {goal.category === "health" && ["kg", "lbs"].includes(goal.unit) && (
            <div className="flex items-start gap-2 rounded-[var(--workspace-radius)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning-text)]">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <p>
                This goal involves body or weight topics. GoMotivateMe is not a
                medical service. Please seek qualified support when needed.
              </p>
            </div>
          )}

          <section aria-label="Goal momentum" className="overflow-hidden rounded-[1.75rem] bg-[var(--color-bg-elev)] p-3">
            <div className="grid min-h-[7rem] grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-[1.15fr_repeat(4,1fr)]">
              <MomentumStat
                icon={CircleGauge}
                label="Goal progress"
                value={`${Math.round(goalPct)}%`}
                detail="On track"
                progress={goalPct}
                variant="card"
                className="col-span-2 sm:col-span-1"
              />
              <MomentumStat
                icon={Flag}
                label="Milestones"
                value={`${goal.currentValue ?? milestones.filter((m: any) => m.done).length} of ${
                  goal.targetValue ?? milestones.length
                }`}
                detail={firstIncomplete?.title ?? "All complete"}
                variant="card"
              />
              <MomentumStat
                icon={Users}
                label="Supporters"
                value={String(supporterCount)}
                detail={
                  supporterTarget
                    ? `${Math.max(0, supporterTarget - supporterCount)} to go`
                    : "people showing up"
                }
                variant="card"
              />
              <MomentumStat
                icon={Target}
                label="Motivation circle"
                value={`${coreMotivators.length} of 6`}
                detail={
                  coreMotivators.length
                    ? "core motivators"
                    : "motivators to add"
                }
                variant="card"
              />
              <MomentumStat
                icon={MessageCircle}
                label="Updates"
                value={String(updatesCount ?? 0)}
                detail="updates shared"
                variant="card"
              />
            </div>
          </section>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.94fr)]">
            <div className="min-w-0 space-y-3">
              <div id="story" className="scroll-mt-24">
                <StorySection story={goal.story} embedded compact />
              </div>

              <HowIWantSupport
                supportTypes={goal.supportTypes ?? []}
                ownerName={ownerName}
              />

              {goal.progressType === "milestones" && milestones.length > 0 ? (
                <PublicMilestonePath milestones={milestones} />
              ) : null}

              <section
                ref={supportSectionRef}
                id="support"
                className="workspace-card scroll-mt-24 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
                    <Sparkles size={18} aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      Choose how to show up
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                      Support here is practical, personal, and never financial.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {!isInactive && !isOwner ? (
                    <StructuredSupportComposer
                      goalId={goalId}
                      allowedTypes={(goal.supportTypes ?? []) as any}
                      onRequireSignIn={() => setSignInOpen(true)}
                    />
                  ) : isOwner ? (
                    <div className="rounded-[var(--workspace-radius)] border border-dashed border-[var(--color-border-strong)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                      This is what visitors use to join your support team.
                    </div>
                  ) : (
                    <div className="rounded-[var(--workspace-radius)] border border-dashed border-[var(--color-border-strong)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                      {isCompleted
                        ? "This goal is complete. Leave a cheer to celebrate."
                        : "This goal is not accepting new supporters right now."}
                    </div>
                  )}
                </div>
              </section>

              <div id="updates" className="scroll-mt-24">
                <RecentActivity
                  goalId={goalId}
                  unit={goal.unit}
                  ownerName={displayName(ownerName)}
                  ownerImage={ownerImage}
                  limit={4}
                />
              </div>

              <EditorialTimeline
                goalId={goalId}
                unit={goal.unit}
                milestones={milestones}
                isOwner={isOwner}
              />

              {!isOwner ? (
                <section ref={cheerSectionRef} id="cheer" className="scroll-mt-24">
                  <ReactionBar goalId={goalId} />
                </section>
              ) : null}

              <div id="supporters" className="scroll-mt-24">
                <SupporterWall goalId={goalId} />
              </div>

              {isOwner ? <CheckInList goalId={goalId} /> : null}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-[5.25rem]">
              <PublicSupportCard
                ownerName={ownerName}
                goalId={goalId}
                isOwner={isOwner}
                isInactive={isInactive}
                isCompleted={isCompleted}
                goalLabel={goalLabel}
                goalPct={goalPct}
                supporterCount={supporterCount}
                supporterTarget={supporterTarget}
                supporterPreview={supporterPreview}
                reactionStats={reactionStats}
                badges={badges as any}
                unit={titleCase(goal.unit || goal.progressType || "progress")}
                copied={copied}
                onShare={onShare}
                onSupport={openSupport}
              />
              <MotivationCircleWidget
                goalId={goalId}
                coreMotivatorMin={goal.coreMotivatorMin ?? 3}
                isOwner={isOwner}
                isLoggedIn={!!user}
              />
              <OrganiserMini
                ownerName={ownerName}
                ownerImage={ownerImage}
                ownerProfileHref={ownerProfileHref}
                goalId={goalId}
              />
            </aside>
          </div>

          <section
            id="creator"
            className="scroll-mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] py-5 text-xs text-[var(--color-text-muted)]"
          >
            <span>
              Started {formatDate(goal.createdAt)}
              {goal.targetDate ? ` · Target ${formatDate(goal.targetDate)}` : ""}
              {goal.category ? ` · ${goal.category}` : ""}
            </span>
            <ReportButton
              goalId={goalId}
              className="inline-flex min-h-11 items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            />
          </section>
        </div>
      </WorkspaceShell>

      <MobileActionBar
        onSupport={openSupport}
        onEncourage={openSupport}
        onCheer={scrollToCheer}
        isOwner={isOwner}
      />
      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        redirectPath={
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/o/${goal.ownerHandle}/${goal.slug}`
        }
      />
    </div>
  );
}

function GoalSocialProof({
  supporters,
  supporterCount,
  reactionStats,
  compact = false,
}: {
  supporters: Array<{ id: string; name: string; image: string | null }>;
  supporterCount: number;
  reactionStats?: { emojiCounts: Record<string, number>; emojiTotal: number };
  compact?: boolean;
}) {
  const reactionGlyphs: Record<string, string> = {
    thumbsup: "👍",
    muscle: "💪",
    heart: "♥",
    fire: "🔥",
  };
  const activeGlyphs = Object.entries(reactionStats?.emojiCounts ?? {})
    .filter(([, count]) => Number(count) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([key]) => reactionGlyphs[key] ?? "");
  const cheerCount = Number(reactionStats?.emojiTotal ?? 0);

  return (
    <div className={`${compact ? "mt-5" : "mt-5"} flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--color-border-subtle)] pt-4`}>
      <div className="flex items-center gap-3">
        {supporterCount > 0 ? (
          <div className="flex items-center" aria-label={`${supporterCount} ${supporterCount === 1 ? "supporter" : "supporters"}`}>
            {supporters.slice(0, 3).map((supporter, index) => (
              <span key={supporter.id} className={index === 0 ? "" : "-ml-2"}>
                <Avatar name={supporter.name} image={supporter.image} size="md" />
              </span>
            ))}
            {supporterCount > supporters.slice(0, 3).length ? (
              <span className="-ml-2 grid h-9 min-w-9 place-items-center rounded-full border-2 border-white bg-[var(--color-bg-sunken)] px-1.5 text-[10px] font-bold text-[var(--color-text-muted)] shadow-sm">
                +{supporterCount - supporters.slice(0, 3).length}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Users size={16} aria-hidden />
          </span>
        )}
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {supporterCount > 0
            ? `${supporterCount} ${supporterCount === 1 ? "person is" : "people are"} showing up`
            : "Open for support"}
        </span>
      </div>
      <span className="hidden h-5 w-px bg-[var(--color-border)] sm:block" aria-hidden />
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
        <span className="tracking-[-0.08em]" aria-hidden>{activeGlyphs.length > 0 ? activeGlyphs.join("") : "♡"}</span>
        <span>{cheerCount} {cheerCount === 1 ? "cheer" : "cheers"}</span>
      </div>
    </div>
  );
}

function PublicMilestonePath({
  milestones,
}: {
  milestones: Array<{
    id: string;
    title: string;
    done: boolean;
    completedAt?: number;
  }>;
}) {
  const nextIndex = milestones.findIndex((milestone) => !milestone.done);
  const completedCount = milestones.filter((milestone) => milestone.done).length;
  const completedPct = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <section
      id="milestones"
      className="scroll-mt-24 rounded-[1.75rem] bg-[var(--color-bg-elev)] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-primary)]">The route ahead</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">Milestone path</h2>
        </div>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)]">
          {completedCount} of {milestones.length} complete
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${completedPct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative min-w-0 rounded-[1.15rem] bg-[var(--color-surface)] p-3.5">
            <span
              className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold ${
                milestone.done
                  ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                  : index === nextIndex
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
            >
              {milestone.done ? <Check size={18} aria-hidden /> : index + 1}
            </span>
            <span className="mt-3 block text-sm font-bold leading-5 text-[var(--color-text)]">
              {milestone.title}
            </span>
            <span
              className={`mt-1 block text-xs ${
                milestone.done
                  ? "text-[var(--color-success-text)]"
                  : index === nextIndex
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-dim)]"
              }`}
            >
              {milestone.done
                ? "Complete"
                : index === nextIndex
                ? "Next"
                : "Upcoming"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicSupportCard({
  ownerName,
  goalId,
  isOwner,
  isInactive,
  isCompleted,
  goalLabel,
  goalPct,
  supporterCount,
  supporterTarget,
  supporterPreview,
  reactionStats,
  badges,
  unit,
  copied,
  onShare,
  onSupport,
}: any) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <Heart size={17} className="text-[var(--color-gold-text)]" aria-hidden />
          {isOwner ? "Your public goal" : `Show up for ${ownerName.split(" ")[0]}`}
        </p>
        <span className="font-mono text-xs font-medium text-[var(--color-primary)]">
          {Math.round(goalPct)}%
        </span>
      </div>

      <div className="mt-5">
        <DualProgress
          goalPct={goalPct}
          supporterCount={supporterCount}
          supporterTarget={supporterTarget}
          goalLabel={goalLabel}
          unit={unit}
        />
      </div>

      <GoalSocialProof
        supporters={supporterPreview}
        supporterCount={supporterCount}
        reactionStats={reactionStats}
        compact
      />

      <div className="mt-4 flex items-center gap-3">
        {isOwner ? (
          <Link href={`/dashboard/${goalId}`} className="workspace-button-primary min-h-10 flex-1">
            Manage goal
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSupport}
            disabled={isInactive}
            className="workspace-button-primary min-h-10 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompleted ? "Goal complete" : "Support this goal"}
          </button>
        )}
        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 px-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
        >
          {copied ? <Check size={14} aria-hidden /> : <Share2 size={14} aria-hidden />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>

      {badges && badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--color-border)] pt-4">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--color-text-muted)]">
            <Trophy size={11} aria-hidden />
            Earned
          </span>
          {badges
            .sort((a: any, b: any) => a.tier - b.tier)
            .map((badge: any) => (
              <span
                key={badge._id}
                className="font-mono text-xs font-medium text-[var(--color-primary)]"
                title={new Date(badge.awardedAt).toLocaleString()}
              >
                {badge.tier}%
              </span>
            ))}
        </div>
      ) : null}
    </section>
  );
}

function OrganiserMini({
  ownerName,
  ownerImage,
  ownerProfileHref,
  goalId,
}: {
  ownerName: string;
  ownerImage: string | null;
  ownerProfileHref: string | null;
  goalId: Id<"goals">;
}) {
  const identity = (
    <>
      <Avatar name={ownerName} image={ownerImage} size="lg" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
          {displayName(ownerName)}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Organising this goal</p>
      </div>
    </>
  );

  return (
    <section className="workspace-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--color-text)]">Goal creator</h2>
        <ReportButton
          goalId={goalId}
          className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        />
      </div>
      {ownerProfileHref ? (
        <Link
          href={ownerProfileHref}
          aria-label={`View ${displayName(ownerName)}'s profile`}
          className="group mt-3 flex min-h-14 items-center gap-3 rounded-[var(--workspace-radius)] outline-none transition hover:bg-[var(--color-bg-elev)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:translate-y-px"
        >
          {identity}
        </Link>
      ) : (
        <div className="mt-3 flex items-center gap-3">{identity}</div>
      )}
    </section>
  );
}

function LightShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">{children}</main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="h-10 w-3/4 animate-pulse rounded bg-[var(--color-bg-sunken)]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[var(--color-bg-sunken)]" />
      <div className="mt-8 h-3 w-full animate-pulse rounded bg-[var(--color-bg-sunken)]" />
    </div>
  );
}
