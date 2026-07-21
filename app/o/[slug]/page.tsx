"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Copy, Share2, Trophy, Heart, MessageSquare, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { ReactionBar } from "@/components/ReactionBar";
import { StructuredSupportComposer } from "@/components/StructuredSupportComposer";
import { SupporterWall } from "@/components/SupporterWall";
import { MilestonesList } from "@/components/MilestonesList";
import { StorySection } from "@/components/StorySection";
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Campaign not found</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This link might be wrong, or the campaign was made private.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Browse live campaigns
          </Link>
        </div>
      </LightShell>
    );
  }

  return <PublicGoalView goalId={goal._id} goal={goal} />;
}

function LightShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f6f1] text-zinc-900">
      <LightHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">{children}</main>
    </div>
  );
}

function LightHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
            m
          </div>
          <span className="font-semibold tracking-tight">gomotivateme</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-600 transition hover:text-zinc-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-emerald-500 px-4 py-1.5 font-medium text-white transition hover:bg-emerald-600"
          >
            Start a goal
          </Link>
        </div>
      </div>
    </header>
  );
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
  const supporters = useQuery(api.supporters.listForGoal, { goalId, limit: 5 });
  const supportMessages = useQuery(api.supportMessages.listForGoal, { goalId });

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
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

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
  const showSupporterTarget = supporterTarget && supporterCount >= 3;
  const ownerName = goal.ownerName ?? owner?.[goal.ownerId]?.name ?? "Someone";
  const ownerImage = goal.ownerImage ?? owner?.[goal.ownerId]?.image ?? null;
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const isClosed = goal.status === "closed";
  const isInactive = isPaused || isClosed;

  const goalPct = goal.progress;
  const supporterPct =
    supporterTarget && supporterTarget > 0
      ? Math.min(100, (supporterCount / supporterTarget) * 100)
      : null;
  const goalLabel =
    goal.progressType === "milestones"
      ? `${goal.currentValue} of ${goal.targetValue} milestones`
      : goal.progressType === "streak"
      ? `${goal.currentValue} day streak`
      : `${formatNumber(goal.currentValue)} of ${formatNumber(goal.targetValue)} ${goal.unit}`;

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-zinc-900">
      {/* Light header (per-page; not the dark Header) */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
              m
            </div>
            <span className="font-semibold tracking-tight">gomotivateme</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-zinc-600 transition hover:text-zinc-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-500 px-4 py-1.5 font-medium text-white transition hover:bg-emerald-600"
            >
              Start a goal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Cover image (full bleed within content area) */}
        {coverUrl && (
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-zinc-200">
            <div className="aspect-[16/7] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left column: title + story + sections */}
          <div className="min-w-0">
            {/* Title + status + meta */}
            <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {goal.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              <span>By</span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-900">
                {ownerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ownerImage}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-white">
                    {ownerName[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                {ownerName}
              </span>
              <span>·</span>
              <span>
                Created {formatDate(goal.createdAt)}
                {goal.category ? ` · ${goal.category}` : ""}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Donations protected
              </span>
            </div>

            {/* Status banner */}
            {(isPaused || isCompleted || isClosed) && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  isPaused
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : isCompleted
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-zinc-300 bg-zinc-100 text-zinc-700"
                }`}
              >
                {isPaused && (
                  <>
                    <strong>Paused.</strong> {goal.pausedReason ?? "Taking a break."} The
                    creator is still on the team.
                  </>
                )}
                {isCompleted && (
                  <>
                    <strong>Completed!</strong> They hit their target. Leave a final note to
                    celebrate.
                  </>
                )}
                {isClosed && <strong>This campaign is closed.</strong>}
              </div>
            )}

            {/* Sensitive category soft warning */}
            {goal.category === "weight" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <p>
                  This goal involves body or weight topics. gomotivateme is not a medical
                  service. If you or someone you know is struggling, please reach out to a
                  qualified professional.
                </p>
              </div>
            )}

            {/* Story */}
            <StorySection story={goal.story} />

            {/* Mobile-only info card (the right card content, shown inline on mobile) */}
            <div className="mt-6 lg:hidden">
              <RightInfoCard
                goal={goal}
                goalId={goalId}
                goalPct={goalPct}
                supporterCount={supporterCount}
                supporterTarget={showSupporterTarget ? supporterTarget : null}
                supporterPct={supporterPct}
                goalLabel={goalLabel}
                supporters={supporters as any}
                supportMessages={supportMessages as any}
                stats={stats}
                badges={badges as any}
                isInactive={isInactive}
                isCompleted={isCompleted}
                allowedTypes={(goal.supportTypes ?? []) as any}
                onShare={onShare}
                copied={copied}
                ownerName={ownerName}
                ownerImage={ownerImage}
              />
            </div>

            {/* Milestones */}
            {goal.progressType === "milestones" && goal.milestones && goal.milestones.length > 0 && (
              <div className="mt-8">
                <MilestonesList
                  goalId={goalId}
                  milestones={goal.milestones}
                  isOwner={false}
                  currentValue={goal.currentValue}
                  targetValue={goal.targetValue}
                  unit={goal.unit}
                />
              </div>
            )}

            {/* Reaction bar (cheer) */}
            <section className="mt-8">
              <ReactionBar goalId={goalId} />
            </section>

            {/* Supporter wall — full list */}
            <SupporterWall goalId={goalId} />

            {/* "Sharing helps more than you think" — share preview */}
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

            {/* Vertical timeline */}
            <section className="mt-10 pb-24 md:pb-10">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900">
                <Calendar size={16} className="text-zinc-500" />
                The journey
              </h2>
              {updates === undefined ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white"
                    />
                  ))}
                </div>
              ) : updates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
                  The journey hasn't started yet. Check back soon.
                </div>
              ) : (
                <div className="relative">
                  <div
                    className="absolute bottom-3 left-[19px] top-3 w-px bg-zinc-200"
                    aria-hidden
                  />
                  <div className="space-y-4">
                    {updates.map((u: any, i: number) => (
                      <div key={u._id} className="relative pl-12">
                        <div className="absolute left-2.5 top-5 h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-white" />
                        <UpdateCard
                          update={u}
                          imageUrl={
                            u.type === "image" && u.imageId ? imageUrls?.[u.imageId] ?? null : null
                          }
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

            {/* Organiser section */}
            <section className="mt-10 border-t border-zinc-200 pt-8">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-base font-semibold text-white">
                    {ownerName[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <div className="text-base font-semibold text-zinc-900">{ownerName}</div>
                  <div className="text-xs text-zinc-500">Organiser</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Created {formatDate(goal.createdAt)}
                {goal.category ? ` · ${goal.category}` : ""}
              </p>
              <a
                href="#"
                className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                Report campaign
              </a>
            </section>
          </div>

          {/* Right column: sticky info card (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <RightInfoCard
                goal={goal}
                goalId={goalId}
                goalPct={goalPct}
                supporterCount={supporterCount}
                supporterTarget={showSupporterTarget ? supporterTarget : null}
                supporterPct={supporterPct}
                goalLabel={goalLabel}
                supporters={supporters as any}
                supportMessages={supportMessages as any}
                stats={stats}
                badges={badges as any}
                isInactive={isInactive}
                isCompleted={isCompleted}
                allowedTypes={(goal.supportTypes ?? []) as any}
                onShare={onShare}
                copied={copied}
                ownerName={ownerName}
                ownerImage={ownerImage}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Trust footer (GoFundMe-style 3-up) */}
      <section className="mt-12 border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 sm:grid-cols-3">
          <TrustItem
            title="Easy"
            body="Support a goal in seconds. No forms, no friction."
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

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-xs text-zinc-500">
          Powered by{" "}
          <Link href="/" className="text-zinc-700 hover:text-zinc-900">
            gomotivateme
          </Link>{" "}
          · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

// --- Right info card (persistent CTA + progress + recent supporters) ---

function RightInfoCard({
  goal,
  goalId,
  goalPct,
  supporterCount,
  supporterTarget,
  supporterPct,
  goalLabel,
  supporters,
  supportMessages,
  stats,
  badges,
  isInactive,
  isCompleted,
  allowedTypes,
  onShare,
  copied,
  ownerName,
  ownerImage,
}: any) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Goal progress — big number */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {goal.category === "weight" || goal.category === "fitness"
              ? "Progress"
              : "Goal progress"}
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {Math.round(goalPct)}%
          </span>
        </div>
        <div className="mt-1 text-2xl font-bold text-zinc-900">{goalLabel}</div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${Math.round(goalPct)}%` }}
          />
        </div>
      </div>

      {/* Supporters */}
      <div className="mt-5 border-t border-zinc-100 pt-4">
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
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
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

      {/* Primary CTA */}
      <div className="mt-5 space-y-2">
        {!isInactive && (
          <a
            href="#support"
            className="block w-full rounded-full bg-emerald-500 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Support this goal
          </a>
        )}
        <button
          onClick={onShare}
          className="block w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 transition hover:border-zinc-400"
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

      {/* Recent supporters (top 5) */}
      {supporters && supporters.length > 0 && (
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Recent supporters
          </h3>
          <ul className="space-y-2">
            {supporters.map((s: any) => {
              const msg = supportMessages?.find(
                (m: any) => m.authorId === s.userId
              );
              return (
                <li
                  key={s._id}
                  className="flex items-start gap-2 text-sm"
                >
                  {ownerImage && false ? null : (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-white">
                      {String(s.supportType).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-900">
                      {s.supportType}
                    </div>
                    {s.pledge && (
                      <div className="line-clamp-1 text-[11px] text-zinc-500 italic">
                        "{s.pledge}"
                      </div>
                    )}
                    {msg && (
                      <div className="line-clamp-2 text-[11px] text-zinc-700">
                        {msg.body}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {relativeTime(s.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="#supporters"
            className="mt-2 block text-center text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            See all supporters →
          </Link>
        </div>
      )}

      {/* Organiser mini */}
      <div className="mt-5 flex items-center gap-2 border-t border-zinc-100 pt-4 text-xs">
        {ownerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ownerImage}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-white">
            {ownerName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-900">{ownerName}</div>
          <div className="truncate text-[11px] text-zinc-500">Organiser</div>
        </div>
        <a
          href="#"
          className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-400"
        >
          Message
        </a>
      </div>
    </div>
  );
}

function SharePreview({
  goal,
  ownerName,
  ownerImage,
  goalPct,
  supporterCount,
  coverUrl,
  onShare,
  copied,
}: any) {
  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">Sharing helps more than you think</h2>
      <p className="mt-1 text-sm text-zinc-600">
        On average, each share helps inspire others to support this campaign and reach more people.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
        {/* Mini share preview card */}
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-zinc-200">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-orange-200 to-amber-200" />
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
            <span>Organised by {ownerName}</span>
            <span>·</span>
            <span className="font-mono">{Math.round(goalPct)}% complete</span>
          </div>
          <div className="text-base font-semibold text-zinc-900 line-clamp-2">{goal.title}</div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium">
              {supporterCount} {supporterCount === 1 ? "supporter" : "supporters"}
            </span>
            <span>·</span>
            <span>{goal.category}</span>
          </div>
          <button
            onClick={onShare}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            {copied ? "Link copied" : "Share this campaign"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Check({ size = 14 }: { size?: number }) {
  // Tiny shim so the SharePreview import above resolves.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-zinc-200" />
      <div className="mt-8 h-3 w-full animate-pulse rounded bg-zinc-200" />
    </div>
  );
}
