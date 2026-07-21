"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { ReactionBar } from "@/components/ReactionBar";
import { MessageForm } from "@/components/MessageForm";
import { MessageBubble } from "@/components/MessageBubble";
import { RecentCheerers } from "@/components/RecentCheerers";
import { OrganizerCard } from "@/components/OrganizerCard";
import { CompletionBanner } from "@/components/CompletionBanner";
import { StickyCta } from "@/components/StickyCta";
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
          <h1 className="text-2xl font-bold">Goal not found</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            This link might be wrong, or the goal was made private.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)]"
          >
            Learn about gomotivateme
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
  const ownerGoalsCount = useQuery(api.goals.listMine, "skip"); // never runs (skip)

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
  const cheerSectionRef = useRef<HTMLDivElement>(null);
  const isComplete = goal.progress >= 100;
  const startMs = goal.createdAt;

  const onCheerClick = () => {
    cheerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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

        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:p-8"
        >
          <ProgressBar value={goal.progress} size="lg" showLabel />
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <Stat
              label="Now"
              value={`${formatNumber(goal.currentValue)} ${goal.unit}`}
              highlight
            />
            <Stat label="Target" value={`${formatNumber(goal.targetValue)} ${goal.unit}`} />
            <Stat
              label={goal.daysRemaining < 0 ? "Overdue" : "Days left"}
              value={
                goal.daysRemaining < 0
                  ? `${Math.abs(goal.daysRemaining)}d`
                  : goal.daysRemaining === 0
                  ? "today"
                  : `${goal.daysRemaining}`
              }
              color={
                goal.daysRemaining < 0
                  ? "danger"
                  : goal.daysRemaining < 7
                  ? "warn"
                  : undefined
              }
            />
          </div>

          {/* Badges */}
          {badges && badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-5 flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 inline-flex items-center gap-1 text-xs text-[var(--color-text-dim)]">
                <Trophy size={11} />
                Milestones
              </span>
              {badges
                .sort((a: any, b: any) => a.tier - b.tier)
                .map((b: any, i: number) => (
                  <BadgeChip
                    key={b._id}
                    tier={b.tier}
                    awardedAt={b.awardedAt}
                    isNew={i === badges.length - 1 && Date.now() - b.awardedAt < 30_000}
                  />
                ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Completion banner */}
      {isComplete && <div className="mt-6"><CompletionBanner goalTitle={goal.title} /></div>}

      {/* Organizer */}
      <div className="mt-6">
        <OrganizerCard
          ownerId={goal.ownerId}
          ownerName={goal.ownerName}
          ownerImage={goal.ownerImage}
          goalCount={Array.isArray(ownerGoalsCount) ? ownerGoalsCount.length : 1}
        />
      </div>

      {/* Story */}
      <StorySection story={goal.story} />

      {/* Reaction bar + cheer count summary */}
      <div ref={cheerSectionRef} className="mt-8">
        <ReactionBar goalId={goalId} />
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-dim)]">
          <span>Started {formatDate(startMs)} · {relativeTime(startMs)}</span>
          <Link
            href={`/o/${goal.slug}#cheer`}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Permalink
          </Link>
        </div>
      </div>

      {/* Recent cheerers */}
      <RecentCheerers goalId={goalId} />

      {/* Approved messages */}
      {stats && stats.messages.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            Notes from the crowd
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.messages.map((m: any, i: number) => (
              <MessageBubble
                key={m._id}
                message={m.message ?? ""}
                displayName={m.displayName}
                createdAt={m.createdAt}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* Leave a message */}
      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Leave a note
        </h2>
        <MessageForm goalId={goalId} />
      </section>

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

      {/* Sticky mobile CTA */}
      <StickyCta
        goalId={goalId}
        emojiCounts={stats?.emojiCounts}
        total={stats?.emojiTotal ?? 0}
        onCheerClick={onCheerClick}
      />
    </PublicShell>
  );
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

function Stat({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: "warn" | "danger";
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          color === "danger"
            ? "text-[var(--color-danger)]"
            : color === "warn"
            ? "text-[var(--color-gold)]"
            : highlight
            ? "text-[var(--color-text)]"
            : "text-[var(--color-text-muted)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
