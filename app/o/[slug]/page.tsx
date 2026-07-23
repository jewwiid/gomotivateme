"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Copy,
  Share2,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BadgeChip } from "@/components/BadgeChip";
import { ReactionBar } from "@/components/ReactionBar";
import { StructuredSupportComposer } from "@/components/StructuredSupportComposer";
import { SupporterWall } from "@/components/SupporterWall";
import { MilestonesList } from "@/components/MilestonesList";
import { StorySection } from "@/components/StorySection";
import { HowIWantSupport } from "@/components/HowIWantSupport";
import { RecentActivity } from "@/components/RecentActivity";
import { EditorialTimeline } from "@/components/EditorialTimeline";
import { MomentumStats } from "@/components/MomentumStats";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ReportButton } from "@/components/ReportButton";
import { MotivationCircleWidget } from "@/components/MotivationCircleWidget";
import { CheckInList } from "@/components/CheckInList";
import { Header } from "@/components/Header";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";

export default function PublicGoalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug as string;
  const goal = useQuery(api.public.getGoalBySlug, { slug });

  if (goal === undefined) {
    return <LightShell><LoadingState /></LightShell>;
  }
  if (goal === null) {
    return (
      <LightShell>
        <div className="py-20 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Goal not found</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This link might be wrong, or the goal is unlisted.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Explore goals
          </Link>
        </div>
      </LightShell>
    );
  }

  return <PublicGoalView goalId={goal._id} goal={goal} />;
}

function PublicGoalView({ goalId, goal }: { goalId: Id<"goals">; goal: any }) {
  const { user } = useCurrentUser();
  const isOwner = !!user && user._id === goal.ownerId;
  const updatesCount = useQuery(api.updates.countForGoal, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const owner = useQuery(api.users.profilesById, { ids: [goal.ownerId] });

  const imageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    if (goal.coverImageId) ids.add(goal.coverImageId);
    return Array.from(ids);
  }, [goal.coverImageId]);
  const imageUrls = useQuery(
    api.storage.getUrls,
    imageIds.length > 0 ? { ids: imageIds } : "skip"
  );

  const imageUrlOf = (id: Id<"_storage">) => imageUrls?.[id] ?? null;
  const coverUrl = imageUrlOf(goal.coverImageId);

  const supportSectionRef = useRef<HTMLDivElement>(null);
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
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const scrollToSupport = () =>
    supportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const supporterCount = goal.supporterCount ?? 0;
  const supporterTarget = goal.supporterTarget ?? null;
  const showSupporterTarget = supporterTarget && supporterCount >= 3;
  const ownerName = goal.ownerName ?? owner?.[goal.ownerId]?.name ?? "Someone";
  const ownerImage = goal.ownerImage ?? owner?.[goal.ownerId]?.image ?? null;
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const isClosed = goal.status === "closed";
  const isInactive = isPaused || isClosed;

  const goalPct = goal.progress;
  const goalLabel =
    goal.progressType === "milestones"
      ? `${goal.currentValue} of ${goal.targetValue} milestones`
      : goal.progressType === "streak"
      ? `${goal.currentValue} day streak`
      : `${formatNumber(goal.currentValue)} of ${formatNumber(goal.targetValue)} ${goal.unit}`;

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 sm:py-14">
        {/* Breadcrumb */}
        <nav className="mb-5 text-sm text-[#777872]">
          <Link href="/#explore" className="hover:text-zinc-700">
            Goals
          </Link>
          <span className="mx-1.5">/</span>
          <span className="capitalize text-zinc-700">{goal.category}</span>
        </nav>

        {/* Title */}
        <h1 className="max-w-4xl text-balance font-display text-4xl font-bold leading-[0.95] tracking-[-0.06em] text-[#292929] sm:text-6xl">
          {goal.title}
        </h1>

        {/* Cover image */}
        {coverUrl && (
          <div className="relative mt-7 overflow-hidden rounded-[1.1rem] bg-[#e8edf9]">
            <div className="aspect-[16/7] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* Byline + status */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[#686963]">
          <span>By</span>
          <span className="flex items-center gap-1.5 font-medium text-zinc-900">
            {ownerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerImage} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-bold text-white">
                {ownerName[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            {ownerName}
          </span>
          <span>·</span>
          <span>
            Started {formatDate(goal.createdAt)} {relativeTime(goal.createdAt)}
          </span>
          {goal.targetDate && (
            <>
              <span>·</span>
              <span>
                Target {formatDate(goal.targetDate)}
              </span>
            </>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            Privacy protected
          </span>
        </div>

        {/* Status banner */}
        {(isPaused || isCompleted || isClosed) && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              isPaused
                ? "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] text-zinc-800"
                : isCompleted
                ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)] text-zinc-800"
                : "border-zinc-300 bg-zinc-100 text-zinc-700"
            }`}
          >
            {isPaused && (
              <>
                <strong className="text-zinc-900">Paused.</strong> {goal.pausedReason ?? "Taking a break."}{" "}
                The creator is still on the team.
              </>
            )}
            {isCompleted && (
              <>
                <strong className="text-zinc-900">Completed!</strong> They hit their target.
                Leave a final note to celebrate.
              </>
            )}
            {isClosed && <strong>This goal is closed.</strong>}
          </div>
        )}

        {/* Sensitive-goal soft warning (health goals with weight units) */}
        {goal.category === "health" && ["kg", "lbs"].includes(goal.unit) && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-zinc-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
            <p>
              This goal involves body or weight topics. gomotivateme is not a medical
              service. If you or someone you know is struggling, please reach out to a
              qualified professional.
            </p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
          {/* Left column: main story + sections */}
          <div className="min-w-0 space-y-6">
            <MomentumStats
              goalId={goalId}
              progressPct={goalPct}
              progressLabel={goalLabel}
              supporterCount={supporterCount}
              supporterTarget={supporterTarget}
              unit={goal.unit}
              updatesCount={updatesCount ?? 0}
              progressType={goal.progressType}
              currentValue={goal.currentValue}
              targetValue={goal.targetValue}
            />

            <HowIWantSupport supportTypes={goal.supportTypes ?? []} ownerName={ownerName} />

            <StorySection story={goal.story} />

            {/* Milestones */}
            {goal.progressType === "milestones" && goal.milestones && goal.milestones.length > 0 && (
              <MilestonesList
                goalId={goalId}
                milestones={goal.milestones}
                isOwner={isOwner}
                currentValue={goal.currentValue ?? 0}
                targetValue={goal.targetValue ?? 0}
                unit={goal.unit}
              />
            )}

            {/* Reaction bar (cheer) — visitors only */}
            {!isOwner && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-base font-semibold text-zinc-900">Cheer them on</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Quick, anonymous reactions to show you noticed.
                </p>
                <div className="mt-3">
                  <ReactionBar goalId={goalId} />
                </div>
              </section>
            )}

            <RecentActivity goalId={goalId} />

            {/* Owner-only: check-ins from motivators */}
            {isOwner && <CheckInList goalId={goalId} />}

            <SupporterWall goalId={goalId} />

            {/* Editorial timeline */}
            <EditorialTimeline
              goalId={goalId}
              unit={goal.unit}
              milestones={goal.milestones ?? undefined}
              isOwner={isOwner}
            />

            {/* Share preview */}
            <SharePreview
              goal={goal}
              ownerName={ownerName}
              ownerImage={ownerImage}
              goalPct={goalPct}
              supporterCount={supporterCount}
              coverUrl={coverUrl}
              onShare={onShare}
              copied={copied}
            />
          </div>

          {/* Right column: sticky support card (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <RightSupportCard
                goal={goal}
                goalId={goalId}
                goalPct={goalPct}
                supporterCount={supporterCount}
                supporterTarget={showSupporterTarget ? supporterTarget : null}
                goalLabel={goalLabel}
                badges={badges as any}
                isInactive={isInactive}
                isCompleted={isCompleted}
                isOwner={isOwner}
                allowedTypes={(goal.supportTypes ?? []) as any}
                onShare={onShare}
                copied={copied}
              />
              <MotivationCircleWidget
                goalId={goalId}
                coreMotivatorMin={goal.coreMotivatorMin ?? 3}
                isOwner={isOwner}
                isLoggedIn={!!user}
              />
              <OrganiserMini ownerName={ownerName} ownerImage={ownerImage} />
            </div>
          </aside>
        </div>

        {/* Full-width support section below (also the #support anchor for mobile sticky) */}
        <section ref={supportSectionRef} id="support" className="mt-10 pb-24 md:pb-10">
          {!isOwner && (
            <h2 className="mb-3 text-base font-semibold text-zinc-900">Send support</h2>
          )}
          {!isInactive && !isOwner && (
            <StructuredSupportComposer
              goalId={goalId}
              allowedTypes={(goal.supportTypes ?? []) as any}
            />
          )}
          {isPaused && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
              This goal is paused, so new supporters can't join right now.
            </div>
          )}
          {isCompleted && (
            <div className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-6 text-center text-sm">
              <p className="font-semibold text-zinc-900">This goal is complete 🎉</p>
              <p className="mt-1 text-zinc-700">
                They did it. Leave a final note if you'd like.
              </p>
            </div>
          )}
        </section>

        {/* Organiser footer */}
        <section className="mt-6 border-t border-zinc-200 pt-8">
          <h2 className="text-base font-semibold text-zinc-900">Organiser</h2>
          <div className="mt-3 flex items-center gap-3">
            {ownerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ownerImage}
                alt=""
                className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-base font-semibold text-white">
                {ownerName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <div className="text-base font-semibold text-zinc-900">{ownerName}</div>
              <div className="text-xs text-zinc-500">Goal creator</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Started {formatDate(goal.createdAt)}
            {goal.targetDate ? ` · Target ${formatDate(goal.targetDate)}` : ""}
            {goal.category ? ` · ${goal.category}` : ""}
          </p>
          <ReportButton goalId={goalId} className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700" />
        </section>
      </main>

      {/* Trust footer */}
      <section className="mt-16 border-y border-[#deddd6] bg-[#f2f4ee] py-12">
        <div className="mx-auto grid max-w-[80rem] grid-cols-1 gap-8 px-5 sm:px-8 sm:grid-cols-3">
          <TrustItem
            title="Easy"
            body="Send support in seconds. No forms, no friction."
          />
          <TrustItem
            title="Meaningful"
            body="Structured support — encouragement, accountability, advice, check-ins, joining in."
          />
          <TrustItem
            title="Private"
            body="Your data stays yours. No public leaderboards or weight rankings."
          />
        </div>
      </section>

      {/* Mobile 3-action sticky bar */}
      <MobileActionBar onSupport={scrollToSupport} onEncourage={scrollToSupport} isOwner={isOwner} />
    </div>
  );
}

// --- Right support card (desktop) ---

function RightSupportCard({
  goal,
  goalId,
  goalPct,
  supporterCount,
  supporterTarget,
  goalLabel,
  badges,
  isInactive,
  isCompleted,
  isOwner,
  allowedTypes,
  onShare,
  copied,
}: any) {
  const supporterPct =
    supporterTarget && supporterTarget > 0
      ? Math.min(100, (supporterCount / supporterTarget) * 100)
      : null;

  return (
    <div className="rounded-[1.1rem] border border-[#deddd6] bg-white p-6 shadow-[0_10px_28px_rgba(31,31,27,0.05)]">
      {/* Goal progress */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Goal progress
          </span>
          <span className="font-mono text-xs text-zinc-500">{Math.round(goalPct)}%</span>
        </div>
        <div className="mt-1 text-2xl font-bold text-zinc-900">{goalLabel}</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#dce5ff]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${Math.round(goalPct)}%` }}
          />
        </div>
      </div>

      {/* Supporters */}
      <div className="mt-6 border-t border-[#e2e1da] pt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Supporters
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {supporterPct !== null ? `${Math.round(supporterPct)}%` : "—"}
          </span>
        </div>
        <div className="mt-1 text-2xl font-bold text-zinc-900">
          {supporterCount}
          {supporterTarget ? ` of ${supporterTarget}` : ""}
        </div>
        {supporterTarget && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-success)] to-[#56c990] transition-all"
              style={{ width: `${supporterPct ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
            <Trophy size={10} />
            Milestones
          </span>
          {badges
            .sort((a: any, b: any) => a.tier - b.tier)
            .map((b: any) => (
              <BadgeChip key={b._id} tier={b.tier} awardedAt={b.awardedAt} />
            ))}
        </div>
      )}

      {/* Primary CTA — visitor-only; owner sees a different message */}
      <div className="mt-5 space-y-2">
        {!isInactive && !isOwner && (
          <a
            href="#support"
            className="block w-full rounded-xl bg-[var(--color-primary)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Support this goal
          </a>
        )}
        {!isInactive && !isOwner && (
          <a
            href="#support"
            className="block w-full rounded-xl border border-[var(--color-primary)] bg-white px-5 py-3 text-center text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            Send encouragement
          </a>
        )}
        {isOwner && !isInactive && (
          <Link
            href="/dashboard"
            className="block w-full rounded-xl bg-[var(--color-primary)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Go to dashboard
          </Link>
        )}
        <button
          onClick={onShare}
          className="block w-full rounded-xl border border-[#bebeb7] bg-white px-5 py-3 text-center text-sm font-semibold text-[#383834] transition hover:border-[var(--color-primary)]"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1.5">
              <Copy size={14} />
              Link copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Share2 size={14} />
              Share
            </span>
          )}
        </button>
      </div>

      {isCompleted && (
        <p className="mt-4 rounded-lg bg-[var(--color-success-soft)] p-3 text-center text-xs font-medium text-zinc-700">
          🎉 They did it. Goal complete.
        </p>
      )}
    </div>
  );
}

function OrganiserMini({ ownerName, ownerImage }: { ownerName: string; ownerImage: string | null }) {
  return (
    <div className="border-t border-[#deddd6] pt-5">
      <div className="flex items-center gap-2">
        {ownerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ownerImage} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-bold text-white">
            {ownerName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-900">{ownerName}</div>
          <div className="truncate text-[11px] text-zinc-500">Goal creator</div>
        </div>
      </div>
    </div>
  );
}

function SharePreview({ goal, ownerName, ownerImage, goalPct, supporterCount, coverUrl, onShare, copied }: any) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">Sharing helps more than you think</h2>
      <p className="mt-1 text-sm text-zinc-600">
        On average, each share inspires new people to show up for this goal.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-zinc-200">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-2 left-2 text-[10px] font-semibold text-white">
            {goal.title.slice(0, 30)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {ownerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerImage} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span>By {ownerName}</span>
            <span>·</span>
            <span className="font-mono">{Math.round(goalPct)}% complete</span>
          </div>
          <div className="line-clamp-2 font-display text-base font-semibold text-zinc-900">
            {goal.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium">
              {supporterCount} {supporterCount === 1 ? "supporter" : "supporters"}
            </span>
            <span>·</span>
            <span className="capitalize">{goal.category}</span>
          </div>
          <button
            onClick={onShare}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            {copied ? "Link copied" : "Share this goal"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}

function LightShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffdf8] text-zinc-900">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">{children}</main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-zinc-200" />
      <div className="mt-8 h-3 w-full animate-pulse rounded bg-zinc-200" />
    </div>
  );
}
