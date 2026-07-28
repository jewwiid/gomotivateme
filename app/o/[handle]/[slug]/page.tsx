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
import { BadgeChip } from "@/components/BadgeChip";
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
import { formatDate, formatNumber } from "@/lib/format";

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
  const { user } = useCurrentUser();
  const isOwner = !!user && user._id === goal.ownerId;
  const updatesCount = useQuery(api.updates.countForGoal, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const owner = useQuery(api.users.profilesById, { ids: [goal.ownerId] });
  const motivators = useQuery(api.motivation.listActiveMotivators, { goalId });

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
    ? imageUrls?.[goal.coverImageId as Id<"_storage">] ?? null
    : null;
  const ownerName = owner?.[goal.ownerId]?.name ?? goal.ownerName ?? "Someone";
  const ownerImage = owner?.[goal.ownerId]?.image ?? goal.ownerImage ?? null;
  const supporterCount = goal.supporterCount ?? 0;
  const supporterTarget = goal.supporterTarget ?? null;
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

  const navItems: WorkspaceNavItem[] = [
    { label: "Overview", href: "#overview", icon: Home, active: true },
    { label: "Why it matters", href: "#story", icon: BookOpen },
    { label: "Milestones", href: "#milestones", icon: Flag },
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
        asideFooter={
          <div className="workspace-card p-4">
            <p className="text-sm font-bold text-[var(--color-text)]">
              {isOwner ? "Your public goal" : `Show up for ${ownerName.split(" ")[0]}`}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
              {isOwner
                ? "Keep the story current from your management workspace."
                : "Encouragement and thoughtful check-ins turn intention into momentum."}
            </p>
            {isOwner ? (
              <Link href={`/dashboard/${goalId}`} className="workspace-button-primary mt-4">
                Manage goal
              </Link>
            ) : (
              <button
                type="button"
                onClick={scrollToSupport}
                className="workspace-button-primary mt-4"
              >
                <Heart size={15} aria-hidden />
                {supportLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onShare}
              className="workspace-button-secondary mt-2"
            >
              {copied ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
              {copied ? "Link copied" : "Share goal"}
            </button>
          </div>
        }
      >
        <div id="overview" className="scroll-mt-24 space-y-4">
          <section className="workspace-card grid min-h-[11rem] gap-5 p-4 md:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)_14rem]">
            <div className="relative min-h-40 overflow-hidden rounded-[0.95rem] bg-[var(--color-bg-sunken)] md:min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl || "/illustrations/hero-community-v3.webp"}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <div className="flex min-w-0 flex-col justify-center py-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isCompleted
                      ? "bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                      : isPaused
                      ? "bg-[var(--color-warning-soft)] text-[var(--color-gold-text)]"
                      : "bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                  }`}
                >
                  {titleCase(goal.status)}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  {titleCase(goal.category || "Goal")}
                </span>
              </div>
              <h1 className="mt-5 title-page">
                {goal.title}
              </h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-[var(--color-text-muted)]">
                {goal.summary || "A public goal made stronger by the people behind it."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Avatar name={ownerName} image={ownerImage} size="md" />
                <span className="font-semibold text-[var(--color-text)]">{ownerName}</span>
                <span aria-hidden>·</span>
                <span>Started {formatDate(goal.createdAt)}</span>
                {goal.targetDate ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Target {formatDate(goal.targetDate)}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:flex xl:flex-col">
              {isOwner ? (
                <Link href={`/dashboard/${goalId}`} className="workspace-button-primary">
                  Manage this goal
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={scrollToSupport}
                  className="workspace-button-primary"
                >
                  <Heart size={16} aria-hidden />
                  {supportLabel}
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
              className={`rounded-xl border p-3 text-sm ${
                isPaused
                  ? "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]"
                  : isCompleted
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-bg-elev)]"
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
            <div className="flex items-start gap-2 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                aria-hidden
              />
              <p>
                This goal involves body or weight topics. GoMotivateMe is not a
                medical service. Please seek qualified support when needed.
              </p>
            </div>
          )}

          <section aria-label="Goal momentum" className="workspace-card overflow-hidden">
            <div className="grid min-h-[7rem] grid-cols-2 sm:grid-cols-3 xl:grid-cols-[1.15fr_repeat(4,1fr)]">
              <MomentumStat
                icon={CircleGauge}
                label="Goal progress"
                value={`${Math.round(goalPct)}%`}
                detail="On track"
                progress={goalPct}
                className="col-span-2 sm:col-span-1"
              />
              <MomentumStat
                icon={Flag}
                label="Milestones"
                value={`${goal.currentValue ?? milestones.filter((m: any) => m.done).length} of ${
                  goal.targetValue ?? milestones.length
                }`}
                detail={firstIncomplete?.title ?? "All complete"}
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
              />
              <MomentumStat
                icon={MessageCircle}
                label="Updates"
                value={String(updatesCount ?? 0)}
                detail="updates shared"
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
                    />
                  ) : isOwner ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                      This is what visitors use to join your support team.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                      {isCompleted
                        ? "This goal is complete. Leave a cheer to celebrate."
                        : "This goal is not accepting new supporters right now."}
                    </div>
                  )}
                </div>
              </section>

              <div id="updates" className="scroll-mt-24">
                <RecentActivity goalId={goalId} limit={4} />
              </div>

              <EditorialTimeline
                goalId={goalId}
                unit={goal.unit}
                milestones={milestones}
                isOwner={isOwner}
              />

              {!isOwner ? (
                <section
                  ref={cheerSectionRef}
                  id="cheer"
                  className="workspace-card scroll-mt-24 p-5"
                >
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
                badges={badges as any}
                copied={copied}
                onShare={onShare}
                onSupport={scrollToSupport}
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
        onSupport={scrollToSupport}
        onEncourage={scrollToSupport}
        onCheer={scrollToCheer}
        isOwner={isOwner}
      />
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

  return (
    <section
      id="milestones"
      className="workspace-card scroll-mt-24 p-4 pb-3"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-[var(--color-text)]">Milestone path</h2>
        <span className="text-xs font-bold text-[var(--color-primary)]">
          {milestones.filter((milestone) => milestone.done).length} of{" "}
          {milestones.length} complete
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative min-w-0">
            {index < milestones.length - 1 ? (
              <span
                aria-hidden
                className={`absolute left-9 right-[-1rem] top-[1.125rem] hidden h-px sm:block ${
                  milestone.done ? "bg-[var(--color-success)]" : "bg-[var(--color-bg-sunken)]"
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-white text-sm font-bold ${
                milestone.done
                  ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                  : index === nextIndex
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              {milestone.done ? <Check size={18} aria-hidden /> : index + 1}
            </span>
            <span className="mt-2 block truncate text-sm font-bold text-[var(--color-text)]">
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
  badges,
  copied,
  onShare,
  onSupport,
}: any) {
  return (
    <section className="workspace-card p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
          <Heart size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--color-text)]">
            {isOwner ? "Your public goal" : `Show up for ${ownerName.split(" ")[0]}`}
          </p>
          <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-[var(--color-text)]">{goalLabel}</p>
              <span className="text-xs font-bold text-[var(--color-primary)]">
                {Math.round(goalPct)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${Math.max(0, Math.min(100, goalPct))}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
              {supporterCount}
              {supporterTarget ? ` of ${supporterTarget}` : ""}{" "}
              {supporterCount === 1 ? "supporter is" : "supporters are"} already
              showing up.
            </p>
            {isOwner ? (
              <Link
                href={`/dashboard/${goalId}`}
                className="workspace-button-primary mt-3 min-h-9"
              >
                Manage goal
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSupport}
                disabled={isInactive}
                className="workspace-button-primary mt-3 min-h-9 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCompleted ? "Goal complete" : "Support this goal"}
              </button>
            )}
          </div>
        </div>
      </div>

      {badges && badges.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-3">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            <Trophy size={11} aria-hidden />
            Milestones
          </span>
          {badges
            .sort((a: any, b: any) => a.tier - b.tier)
            .map((badge: any) => (
              <BadgeChip
                key={badge._id}
                tier={badge.tier}
                awardedAt={badge.awardedAt}
              />
            ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onShare}
        className="mt-3 min-h-10 w-full rounded-xl bg-[var(--color-bg-elev)] px-3 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
      >
        <span className="inline-flex items-center gap-2">
          {copied ? <Check size={14} aria-hidden /> : <Share2 size={14} aria-hidden />}
          {copied ? "Link copied" : "Share with someone"}
        </span>
      </button>
    </section>
  );
}

function OrganiserMini({
  ownerName,
  ownerImage,
  goalId,
}: {
  ownerName: string;
  ownerImage: string | null;
  goalId: Id<"goals">;
}) {
  return (
    <section className="workspace-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--color-text)]">Goal creator</h2>
        <ReportButton
          goalId={goalId}
          className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={ownerName} image={ownerImage} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--color-text)]">{ownerName}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Organising this goal</p>
        </div>
      </div>
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
