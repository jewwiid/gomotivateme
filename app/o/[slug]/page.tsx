"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Share2, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { ReactionBar } from "@/components/ReactionBar";
import { DualProgress } from "@/components/DualProgress";
import { StructuredSupportComposer } from "@/components/StructuredSupportComposer";
import { SupporterWall } from "@/components/SupporterWall";
import { CampaignStatusBanner } from "@/components/CampaignStatusBanner";
import { MilestonesList } from "@/components/MilestonesList";
import { SensitiveGoalWarning } from "@/components/SensitiveGoalWarning";
import { StorySection } from "@/components/StorySection";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";

export default function PublicGoalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug as string;
  const goal = useQuery(api.public.getGoalBySlug, { slug });

  if (goal === undefined) {
    return <PublicShell><LoadingState /></PublicShell>;
  }
  if (goal === null) {
    return (
      <PublicShell>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Campaign not found</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            This link might be wrong, or the campaign was made private.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)]"
          >
            Browse live campaigns
          </Link>
        </div>
      </PublicShell>
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
  const updates = useQuery(api.updates.listForGoal, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const stats = useQuery(api.reactions.publicStats, { goalId });
  const owner = useQuery(api.users.profilesById, { ids: [goal.ownerId] });

  // Resolve cover + update image URLs in one batched query.
  const imageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    if (goal.coverImageId) ids.add(goal.coverImageId);
    for (const u of updates ?? []) if (u.imageId) ids.add(u.imageId);
    return Array.from(ids);
  }, [updates, goal.coverImageId]);
  const imageUrls = useQuery(
    api.storage.getUrls,
    imageIds.length > 0 ? { ids: imageIds } : "skip"
  );

  const coverUrl = goal.coverImageId ? imageUrls?.[goal.coverImageId] : null;
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

  const supporterCount = goal.supporterCount ?? 0;
  const supporterTarget = goal.supporterTarget ?? null;
  const showSupporterTarget = supporterTarget && supporterCount >= 3; // empty-campaign protection
  const ownerName = goal.ownerName ?? owner?.[goal.ownerId]?.name ?? "Someone";
  const ownerHandle = owner?.[goal.ownerId]?.handle ?? null;
  const ownerImage = goal.ownerImage ?? owner?.[goal.ownerId]?.image ?? null;
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const isClosed = goal.status === "closed";
  const isInactive = isPaused || isClosed;

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative">
        {coverUrl ? (
          <div className="relative -mx-5 sm:-mx-6">
            <div className="relative aspect-[3/1] w-full overflow-hidden bg-[var(--color-bg-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 sm:inset-x-6">
                <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/80">
                  <CategoryIcon category={goal.category} size={12} />
                  {goal.category}
                </div>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  {goal.title}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              <CategoryIcon category={goal.category} size={12} />
              {goal.category}
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {goal.title}
            </h1>
          </div>
        )}

        {/* Byline + support types */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <span>
            By <span className="font-medium text-[var(--color-text)]">{ownerName}</span>
          </span>
          {goal.supportTypes && goal.supportTypes.length > 0 && (
            <>
              <span>·</span>
              <span className="text-xs">
                Looking for:{" "}
                {goal.supportTypes
                  .map((t: string) => SUPPORT_LABEL[t] ?? t)
                  .join(" · ")}
              </span>
            </>
          )}
        </div>

        {/* Status + sensitive warnings */}
        <div className="mt-4 space-y-3">
          <CampaignStatusBanner
            status={goal.status}
            pausedReason={goal.pausedReason}
            completedAt={goal.completedAt}
          />
          <SensitiveGoalWarning category={goal.category} />
        </div>

        {/* Dual progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
        >
          <DualProgress
            goalPct={goal.progress}
            supporterCount={supporterCount}
            supporterTarget={showSupporterTarget ? supporterTarget : null}
            goalLabel={buildGoalLabel(goal)}
            unit={goal.unit}
          />
          {badges && badges.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-4">
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
        </motion.div>
      </section>

      {/* Story */}
      <StorySection story={goal.story} />

      {/* Milestones (if milestone template) */}
      {goal.progressType === "milestones" && goal.milestones && goal.milestones.length > 0 && (
        <MilestonesList
          goalId={goalId}
          milestones={goal.milestones}
          isOwner={false}
          currentValue={goal.currentValue}
          targetValue={goal.targetValue}
          unit={goal.unit}
        />
      )}

      {/* Support CTA */}
      <section ref={supportSectionRef} className="mt-8" id="support">
        {!isInactive && (
          <StructuredSupportComposer
            goalId={goalId}
            allowedTypes={(goal.supportTypes ?? []) as any}
          />
        )}
        {isPaused && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            This campaign is paused, so new supporters can't join right now.
          </div>
        )}
        {isCompleted && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center text-sm">
            <p className="font-semibold text-emerald-400">This campaign is complete 🎉</p>
            <p className="mt-1 text-[var(--color-text-muted)]">
              They did it. Leave a final note if you'd like.
            </p>
          </div>
        )}
      </section>

      {/* Reaction bar (cheer) */}
      <section className="mt-6">
        <ReactionBar goalId={goalId} />
      </section>

      {/* Supporter wall */}
      <SupporterWall goalId={goalId} />

      {/* Vertical timeline */}
      <section className="mt-10 pb-24 md:pb-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <Calendar size={14} />
          The journey
        </h2>
        {updates === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 p-8 text-center text-sm text-[var(--color-text-dim)]">
            The journey hasn't started yet. Check back soon.
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-3 left-[19px] top-3 w-px bg-[var(--color-border)]" aria-hidden />
            <div className="space-y-4">
              {updates.map((u: any, i: number) => (
                <div key={u._id} className="relative pl-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 18 }}
                    className="absolute left-2.5 top-5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-bg)]"
                    aria-hidden
                  />
                  <UpdateCard
                    update={u}
                    imageUrl={u.type === "image" && u.imageId ? imageUrls?.[u.imageId] ?? null : null}
                    unit={goal.unit}
                    direction={goal.direction}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sticky mobile CTA — Share + Cheer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button
            onClick={onShare}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
          >
            <Share2 size={14} />
            {copied ? "Link copied" : "Share"}
          </button>
          <a
            href="#support"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            Support
          </a>
        </div>
      </div>
    </PublicShell>
  );
}

const SUPPORT_LABEL: Record<string, string> = {
  encourage: "encouragement",
  experience: "shared experience",
  advice: "advice",
  checkin: "check-ins",
  join: "company",
};

function buildGoalLabel(goal: any) {
  if (goal.progressType === "milestones") {
    return `${goal.currentValue} of ${goal.targetValue} milestones`;
  }
  if (goal.progressType === "streak") {
    return `${goal.currentValue} day streak`;
  }
  return `${formatNumber(goal.currentValue)} of ${formatNumber(goal.targetValue)} ${goal.unit}`;
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">{children}</main>
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-2xl px-5 py-6 text-center text-xs text-[var(--color-text-dim)] sm:px-6">
          Powered by{" "}
          <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            gomotivateme
          </Link>
          · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="py-10">
      <div className="h-10 w-3/4 animate-pulse rounded bg-[var(--color-bg-card)]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[var(--color-bg-card)]" />
      <div className="mt-8 h-3 w-full animate-pulse rounded bg-[var(--color-bg-card)]" />
    </div>
  );
}
