"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { displayName, relativeTime } from "@/lib/format";
import { journeyIllustrationForProgress } from "@/lib/journeyIllustrations";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function PublicGoalCard({
  goal,
  index = 0,
  coverImageUrl,
}: {
  goal: any;
  index?: number;
  coverImageUrl?: string | null;
}) {
  const goalId = goal._id as Id<"goals">;
  const publicDetail = useQuery(
    api.public.getGoalByHandleAndSlug,
    goal.ownerHandle ? { handle: goal.ownerHandle, slug: goal.slug } : "skip"
  );
  const reactionStats = useQuery(api.reactions.publicStats, { goalId });
  const supporterRows = useQuery(api.supporters.listForGoal, { goalId, limit: 3 });
  const supporterIds = useMemo(
    () =>
      (supporterRows ?? [])
        .map((supporter) => supporter.userId)
        .filter((id): id is Id<"users"> => Boolean(id)),
    [supporterRows]
  );
  const supporterProfiles = useQuery(
    api.users.profilesById,
    supporterIds.length > 0 ? { ids: supporterIds } : "skip"
  );
  const progress = Math.max(0, Math.min(100, Number(goal.progress ?? 0)));
  const ownerName = displayName(goal.ownerName ?? "Anonymous");
  const supporters = (supporterRows ?? [])
    .map((supporter) => {
      const profile = supporter.userId ? supporterProfiles?.[supporter.userId] : null;
      if (!profile) return null;
      return {
        name: profile.name ?? profile.handle ?? "Supporter",
        image: profile.image ?? undefined,
      };
    })
    .filter(Boolean) as Array<{ name: string; image?: string }>;
  const supporterCount = Number(goal.supporterCount ?? 0);
  const reactionTotal = Number(reactionStats?.emojiTotal ?? 0);
  const reactionGlyphs = activeReactionGlyphs(reactionStats?.emojiCounts);
  const enrichedGoal = { ...goal, milestones: publicDetail?.milestones };
  const checkpoint = goalCheckpoint(enrichedGoal, progress);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.2), ease: easeOut }}
      className="h-full"
    >
      <Link
        href={`/o/${goal.ownerHandle}/${goal.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border)] hover:shadow-[0_26px_60px_-42px_rgba(55,47,35,0.5)] active:translate-y-0"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-bg-elev)]">
          {coverImageUrl === undefined ? (
            <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-sunken)]" aria-hidden />
          ) : coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt={`${goal.title} cover`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <Image
              src={journeyIllustrationForProgress(progress).src}
              alt=""
              fill
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--color-text-muted)]">
            <span>{formatCategory(goal.category)}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="pt-6">
            <h3 className="text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] transition group-hover:text-[var(--color-primary)] sm:text-3xl">
              {goal.title}
            </h3>
            {goal.summary ? (
              <p className="mt-3 line-clamp-2 min-h-12 max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">
                {goal.summary}
              </p>
            ) : (
              <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--color-text-muted)]">
                Follow the progress and help this goal keep moving.
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <GoalAvatar name={ownerName} image={goal.ownerImage} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">{ownerName}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Started {relativeTime(goal.createdAt)}</p>
              </div>
            </div>
            <SupporterAvatarStack supporters={supporters} total={supporterCount} />
          </div>

          <dl className="mt-4 grid grid-cols-[1.35fr_0.8fr_0.9fr] divide-x divide-[var(--color-border)] border-y border-[var(--color-border)] py-3">
            <GoalMetric label="Progress" value={formatGoalMetric(enrichedGoal)} />
            <GoalMetric label="Supporters" value={goal.supporterTarget ? `${supporterCount}/${goal.supporterTarget}` : String(supporterCount)} />
            <div className="min-w-0 pl-3 sm:pl-4">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Reactions</dt>
              <dd className="mt-1 flex min-w-0 items-center gap-1 text-sm font-semibold tabular-nums text-[var(--color-text)]">
                {reactionGlyphs.length > 0 ? <span className="truncate tracking-[-0.08em]" aria-hidden>{reactionGlyphs.join("")}</span> : null}
                <span>{reactionTotal}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Flag size={14} strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{checkpoint.kicker}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{checkpoint.label}</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">{checkpoint.meta}</span>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function GoalAvatar({ name, image, small = false }: { name: string; image?: string | null; small?: boolean }) {
  const initials = name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const size = small ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={`${name}'s avatar`} className={`${size} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`} />;
  }
  return <span aria-label={`${name}'s avatar`} className={`${size} grid shrink-0 place-items-center rounded-full border-2 border-white bg-[var(--color-primary)] font-bold text-white shadow-sm`}>{initials}</span>;
}

function SupporterAvatarStack({ supporters, total }: { supporters: Array<{ name: string; image?: string }>; total: number }) {
  if (total === 0) return <span className="shrink-0 text-xs font-medium text-[var(--color-primary)]">Open for support</span>;
  const remaining = Math.max(0, total - supporters.length);
  return (
    <div className="flex shrink-0 items-center" aria-label={`${total} ${total === 1 ? "supporter" : "supporters"}`}>
      {supporters.map((supporter, index) => <span key={`${supporter.name}-${index}`} className={index === 0 ? "" : "-ml-2"}><GoalAvatar name={supporter.name} image={supporter.image} small /></span>)}
      {remaining > 0 ? <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full border-2 border-white bg-[var(--color-bg-sunken)] px-1.5 text-[10px] font-bold text-[var(--color-text-muted)] shadow-sm">+{remaining}</span> : null}
    </div>
  );
}

function GoalMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3 first:pl-0 sm:px-4 sm:first:pl-0"><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{label}</dt><dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--color-text)]">{value}</dd></div>;
}

function formatGoalMetric(goal: any) {
  const current = Number(goal.currentValue ?? goal.startValue ?? 0);
  const target = Number(goal.targetValue ?? 0);
  const unit = String(goal.unit ?? "").trim();
  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  if (goal.progressType === "milestones") {
    const milestones = (goal.milestones ?? []) as Array<{ done: boolean }>;
    return `${milestones.filter((milestone) => milestone.done).length}/${milestones.length} milestones`;
  }
  return `${number.format(current)}/${number.format(target)}${unit ? ` ${unit}` : ""}`;
}

function goalCheckpoint(goal: any, progress: number) {
  const milestones = (goal.milestones ?? []) as Array<{ title: string; done: boolean }>;
  if (milestones.length > 0) {
    const completed = milestones.filter((milestone) => milestone.done).length;
    const next = milestones.find((milestone) => !milestone.done);
    return next ? { kicker: "Next milestone", label: next.title, meta: `${completed}/${milestones.length} done` } : { kicker: "Milestones", label: "Every milestone reached", meta: `${completed}/${milestones.length} done` };
  }
  if (progress >= 100) return { kicker: "Checkpoint", label: "Goal complete", meta: "100% reached" };
  const nextCheckpoint = [25, 50, 75, 100].find((value) => value > progress) ?? 100;
  return { kicker: "Next checkpoint", label: `${nextCheckpoint}% of the goal`, meta: `${Math.round(progress)}% now` };
}

function activeReactionGlyphs(counts?: Record<string, number>) {
  const glyphs: Record<string, string> = { thumbsup: "👍", muscle: "💪", heart: "♥", fire: "🔥" };
  return Object.entries(counts ?? {}).filter(([, count]) => Number(count) > 0).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 3).map(([key]) => glyphs[key] ?? "");
}

function formatCategory(category?: string) {
  if (!category) return "Personal goal";
  return category.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
