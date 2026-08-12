"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Award, Calendar, Image as ImageIcon, Images, Link as LinkIcon, MessageSquare, TrendingUp } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { UpdateMedia, UpdateMediaItem } from "./UpdateMedia";
import { UpdateReactions } from "./UpdateReactions";
import { useMemo } from "react";
import { ReportButton } from "./ReportButton";
import { LinkPreviewCard } from "./LinkPreviewCard";

interface UpdateDoc {
  _id: Id<"updates">;
  type: "value" | "milestone" | "note" | "image" | "media" | "link";
  value?: number;
  note?: string;
  imageId?: Id<"_storage">;
  media?: UpdateMediaItem[];
  linkUrl?: string;
  linkTitle?: string;
  linkImage?: Id<"_storage">;
  linkDescription?: string;
  linkSiteName?: string;
  milestoneId?: string;
  createdAt: number;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatDay(ts: number) {
  const d = new Date(ts);
  return {
    month: MONTHS[d.getMonth()],
    day: d.getDate().toString().padStart(2, "0"),
    year: d.getFullYear().toString(),
    full: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

/**
 * Editorial dated timeline — the doc's signature element.
 * Each entry gets a big month/day marker on the left, content on the right.
 */
export function EditorialTimeline({
  goalId,
  unit = "units",
  milestones,
  isOwner = false,
}: {
  goalId: Id<"goals">;
  unit?: string;
  milestones?: Array<{ id: string; title: string; done: boolean }>;
  isOwner?: boolean;
}) {
  const { results: updates, status, loadMore } = usePaginatedQuery(
    api.updates.listForGoalPaginated,
    { goalId },
    { initialNumItems: 8 }
  );
  const imageIds = useMemo(() => {
    const ids = new Set<Id<"_storage">>();
    for (const update of updates) {
      if (update.imageId) ids.add(update.imageId);
      if (update.linkImage) ids.add(update.linkImage);
      for (const media of update.media ?? []) {
        if (media.kind === "image") {
          if (media.storageId) ids.add(media.storageId);
          if (media.thumbnailId) ids.add(media.thumbnailId);
        }
      }
    }
    return Array.from(ids);
  }, [updates]);
  const imageUrls = useQuery(
    api.storage.getUrls,
    imageIds.length > 0 ? { ids: imageIds } : "skip"
  );
  const imageUrlOf = (imageId: Id<"_storage">) => imageUrls?.[imageId] ?? null;
  const groupedUpdates = useMemo(() => {
    const groups: Array<{ key: string; createdAt: number; updates: UpdateDoc[] }> = [];
    for (const update of updates as UpdateDoc[]) {
      const date = new Date(update.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const current = groups[groups.length - 1];
      if (current?.key === key) {
        current.updates.push(update);
      } else {
        groups.push({ key, createdAt: update.createdAt, updates: [update] });
      }
    }
    return groups;
  }, [updates]);

  if (status === "LoadingFirstPage") {
    return (
      <section className="workspace-card overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-7">
          <div className="h-3 w-24 animate-pulse bg-[var(--color-bg-sunken)]" />
          <div className="mt-3 h-7 w-56 animate-pulse bg-[var(--color-bg-sunken)]" />
        </div>
        <div className="space-y-0 divide-y divide-[var(--color-border)] px-5 sm:px-7">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse py-5">
              <div className="h-full bg-[var(--color-bg-elev)]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (updates.length === 0) {
    // Two flavours of empty state:
    //  - If the goal has milestones planned, point at the first one so the
    //    owner can tick it off (which now creates a journey entry).
    //  - Otherwise, fall back to the generic "nothing here yet".
    const nextMilestone =
      milestones && milestones.length > 0
        ? milestones.find((m) => !m.done)
        : undefined;
    return (
      <section className="workspace-card border-dashed px-6 py-10 text-left sm:px-8">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
          <Calendar size={14} aria-hidden /> Goal journal
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.035em] text-[var(--color-text)]">
          {nextMilestone
            ? "Start with the first step"
            : "No updates yet"}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {nextMilestone
            ? `Tick off “${nextMilestone.title}” to post your first update.`
            : "Post your first update when you're ready to share progress."}
        </p>
      </section>
    );
  }

  return (
    <section className="workspace-card overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            <Calendar size={14} aria-hidden /> Goal journal
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-[var(--color-text)] sm:text-[1.7rem]">
            The work behind the progress.
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-5 text-[var(--color-text-muted)]">
            Updates, breakthroughs, and the days this goal moved forward.
          </p>
        </div>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {updates.length} {updates.length === 1 ? "entry" : "entries"}
        </span>
      </header>

      <ol className="px-4 sm:px-5">
        {groupedUpdates.map((group, groupIndex) => {
          const d = formatDay(group.createdAt);
          const hasAchievement = group.updates.some((update) => update.type === "milestone");
          return (
            <motion.li
              key={group.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ type: "spring", stiffness: 120, damping: 22, delay: Math.min(groupIndex * 0.05, 0.35) }}
              className="grid grid-cols-[3rem_0.85rem_minmax(0,1fr)] gap-x-2 border-b border-[var(--color-border)] py-4 last:border-b-0 sm:grid-cols-[3.75rem_1rem_minmax(0,1fr)] sm:gap-x-3 sm:py-5"
            >
              <div className="text-right">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)] sm:text-[11px]">
                  {d.month}
                </div>
                <div className="font-display text-[1.45rem] font-bold leading-none tracking-[-0.05em] text-[var(--color-text)] sm:text-[1.65rem]">
                  {parseInt(d.day, 10)}
                </div>
                <div className="mt-1 font-mono text-[9px] text-[var(--color-text-dim)] sm:text-[10px]">{d.year}</div>
              </div>

              <div className="relative flex justify-center" aria-hidden>
                <span
                  className={`relative z-[1] mt-1.5 h-3 w-3 rounded-full border-[3px] border-[var(--color-surface)] ${
                    hasAchievement ? "bg-[var(--color-gold)]" : "bg-[var(--color-primary)]"
                  }`}
                />
                {groupIndex < groupedUpdates.length - 1 ? (
                  <span className="absolute left-1/2 top-3 h-[calc(100%+1.25rem)] w-px -translate-x-1/2 bg-[var(--color-border-strong)]" />
                ) : null}
              </div>

              <div className="min-w-0 divide-y divide-[var(--color-border-subtle)]">
                {group.updates.map((u) => {
                  const linkedMilestone = u.milestoneId
                    ? milestones?.find((milestone) => milestone.id === u.milestoneId)
                    : undefined;
                  const milestoneTitle = linkedMilestone?.title ?? u.note ?? "Milestone complete";
                  const valueLabel =
                    u.value === undefined
                      ? "Progress logged"
                      : unit === "days"
                      ? `${u.value} day streak`
                      : `${u.value} ${unit}`;

                  return (
                    <article
                      key={u._id}
                      className={`group relative py-3.5 first:pt-0 last:pb-0 ${
                        u.type === "milestone"
                          ? "border-l-2 border-[var(--color-gold)] pl-3"
                          : ""
                      }`}
                    >
                      <EntryHeader u={u} />

                      {u.type === "milestone" ? (
                        <div>
                          <h3 className="max-w-[28ch] font-display text-lg font-bold leading-tight tracking-[-0.035em] text-[var(--color-text)] sm:text-xl">
                            {milestoneTitle}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                            A milestone was completed and added to the journey.
                          </p>
                        </div>
                      ) : (
                        <>
                          {u.type === "value" ? (
                            <p className="font-display text-lg font-bold tracking-[-0.025em] text-[var(--color-text)]">
                              {valueLabel}
                            </p>
                          ) : null}
                          {linkedMilestone ? (
                            <span className="mb-2 inline-flex items-center border-b border-[var(--color-primary)] pb-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                              Working on {linkedMilestone.title}
                            </span>
                          ) : null}
                          <EntryBody u={u} unit={unit} imageUrlOf={imageUrlOf} />
                          {u.note ? (
                            <p className="mt-1.5 max-w-[62ch] text-sm leading-6 text-[var(--color-text-secondary)]">
                              {u.note}
                            </p>
                          ) : null}
                        </>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {!isOwner ? (
                          <UpdateReactions updateId={u._id} goalId={goalId} />
                        ) : null}
                        <ReportButton
                          goalId={goalId}
                          updateId={u._id}
                          className="inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] text-[var(--color-text-dim)] opacity-60 transition hover:text-[var(--color-text-secondary)] hover:opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </motion.li>
          );
        })}
      </ol>
      {status !== "Exhausted" && (
        <div className="border-t border-[var(--color-border)] px-5 py-5 text-center sm:px-7">
          <button
            type="button"
            onClick={() => loadMore(8)}
            disabled={status === "LoadingMore"}
            className="inline-flex min-h-10 items-center border-b border-[var(--color-text)] px-1 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            {status === "LoadingMore" ? "Loading updates..." : "Load earlier updates"}
          </button>
        </div>
      )}
    </section>
  );
}

function EntryHeader({ u }: { u: UpdateDoc }) {
  if (u.type === "value") {
    return (
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
        <TrendingUp size={13} aria-hidden />
        Progress logged
      </div>
    );
  }
  if (u.type === "milestone") {
    return (
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-gold-text)]">
        <Award size={15} aria-hidden />
        Achievement unlocked
      </div>
    );
  }
  if (u.type === "image") {
    return (
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <ImageIcon size={13} aria-hidden />
        Photo
      </div>
    );
  }
  if (u.type === "media") {
    return (
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Images size={13} aria-hidden />
        Media update
      </div>
    );
  }
  if (u.type === "link") {
    return (
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <LinkIcon size={13} aria-hidden />
        Link shared
      </div>
    );
  }
  return (
    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <MessageSquare size={13} aria-hidden />
      Note
    </div>
  );
}

function EntryBody({
  u,
  unit,
  imageUrlOf,
}: {
  u: UpdateDoc;
  unit: string;
  imageUrlOf?: (imageId: Id<"_storage">) => string | null;
}) {
  if (u.type === "media") {
    return <UpdateMedia media={u.media} imageUrlOf={imageUrlOf} />;
  }
  if (u.type === "image" && u.imageId && imageUrlOf) {
    const url = imageUrlOf(u.imageId);
    if (url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt="" className="mb-2 max-h-72 w-full rounded-xl object-cover" />;
    }
  }
  if (u.type === "link" && u.linkUrl) {
    return (
      <div className="mt-1">
        <LinkPreviewCard
          url={u.linkUrl}
          title={u.linkTitle}
          description={u.linkDescription}
          siteName={u.linkSiteName}
          imageUrl={u.linkImage ? imageUrlOf?.(u.linkImage) ?? null : null}
          compact
        />
      </div>
    );
  }
  return null;
}
