"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { ThumbsUpButton } from "@/components/ThumbsUpButton";
import { MessageForm } from "@/components/MessageForm";
import { MessageBubble } from "@/components/MessageBubble";
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
            Learn about myodyssey
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
  goal: NonNullable<ReturnType<typeof useQuery<typeof api.public.getGoalBySlug>>>;
}) {
  const updates = useQuery(api.updates.listForGoal, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const stats = useQuery(api.reactions.publicStats, { goalId });

  // Resolve image URLs in one batched query.
  const imageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    for (const u of updates ?? []) if (u.imageId) ids.add(u.imageId);
    return Array.from(ids);
  }, [updates]);
  const imageUrls = useQuery(
    api.storage.getUrls,
    imageIds.length > 0 ? { ids: imageIds } : "skip"
  );

  const startMs = useMemo(() => goal.createdAt, [goal.createdAt]);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/15 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:p-8"
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
            <CategoryIcon category={goal.category} size={12} />
            {goal.category}
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
              {goal.description}
            </p>
          )}

          {/* Progress */}
          <div className="mt-7">
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

          {/* Reactions row */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-5">
            <ThumbsUpButton goalId={goalId} />
            <div className="ml-auto text-xs text-[var(--color-text-dim)]">
              Started {formatDate(startMs)} · {relativeTime(startMs)}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Cheer / message */}
      <section className="mt-6">
        <MessageForm goalId={goalId} />
      </section>

      {/* Approved public messages */}
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

      {/* Vertical timeline */}
      <section className="mt-10">
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
            {/* Timeline rail */}
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

      {/* CTA */}
      <section className="mt-16 rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-gold)]/10 p-8 text-center">
        <h3 className="text-xl font-bold">Want to run your own odyssey?</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Set a goal, share a link, let the people cheering you on send notes.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
        >
          Start yours
        </Link>
      </section>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-2xl px-5 py-6 text-center text-xs text-[var(--color-text-dim)]">
          Powered by <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">myodyssey</Link>
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
