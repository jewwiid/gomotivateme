"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Heart,
  Lightbulb,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatNumber } from "@/lib/format";

type Tab = "goals" | "motivating";

const ROLE_META: Record<
  string,
  { label: string; color: string }
> = {
  encourager: { label: "Encourager", color: "text-rose-500" },
  accountability: { label: "Accountability", color: "text-emerald-500" },
  advice: { label: "Advice", color: "text-amber-500" },
  review: { label: "Review", color: "text-sky-500" },
  challenge: { label: "Challenge", color: "text-violet-500" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After each update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

function pct(start: number, current: number, target: number, dir: string) {
  const total = dir === "decrease" ? start - target : target - start;
  if (total <= 0) return 0;
  const moved = dir === "decrease" ? start - current : current - start;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle;
  const [tab, setTab] = useState<Tab>("goals");

  const summary = useQuery(api.users.profileSummary, { handle });
  const coverUrl = useQuery(
    api.storage.getUrls,
    summary?.user.coverImageId
      ? { ids: [summary.user.coverImageId as Id<"_storage">] }
      : "skip"
  );
  const coverImageUrl = summary?.user.coverImageId
    ? coverUrl?.[summary.user.coverImageId as Id<"_storage">] ?? null
    : null;

  if (summary === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  if (summary === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Profile not found</h1>
          <p className="mt-3 text-sm text-zinc-600">
            @{handle} hasn't set up a profile yet, or the handle is wrong.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, goals, motivations } = summary;
  const displayName = user.name ?? `@${user.handle ?? "user"}`;
  const initials = (user.name ?? user.handle ?? "?")
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Cover photo (or gradient fallback) */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-accent)] to-zinc-200 sm:h-56">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft size={12} />
            gomotivateme
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 pb-20">
        {/* Avatar + name + bio — overlaps the cover */}
        <div className="-mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative shrink-0">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-2xl font-bold text-white shadow-md sm:h-28 sm:w-28">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {displayName}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              @{user.handle ?? "no-handle-yet"}
            </p>
            {user.bio && (
              <p className="mt-3 max-w-2xl text-sm text-zinc-700">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-6">
          <StatBlock label="Goals" value={stats.goalsCount} icon={<Target size={14} className="text-zinc-400" />} />
          <StatBlock label="Motivating" value={stats.motivatingCount} icon={<Heart size={14} className="text-zinc-400" />} />
          <StatBlock label="Supporters" value={stats.supportersCount} icon={<Users size={14} className="text-zinc-400" />} />
        </div>

        {/* Tabs */}
        <div className="mt-10 border-b border-zinc-200">
          <div className="flex gap-1">
            <TabButton active={tab === "goals"} onClick={() => setTab("goals")}>
              Goals
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-600">
                {goals.length}
              </span>
            </TabButton>
            <TabButton
              active={tab === "motivating"}
              onClick={() => setTab("motivating")}
            >
              Motivating
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-600">
                {motivations.length}
              </span>
            </TabButton>
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {tab === "goals" && <GoalsGrid goals={goals} />}
          {tab === "motivating" && <MotivationsList motivations={motivations} />}
        </div>
      </main>
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-zinc-900">
        {formatNumber(value)}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px flex items-center border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-zinc-900 text-zinc-900"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function GoalsGrid({
  goals,
}: {
  goals: Array<{
    _id: Id<"goals">;
    title: string;
    slug: string;
    summary?: string;
    category: string;
    coverImageId?: Id<"_storage">;
    currentValue: number;
    targetValue: number;
    unit: string;
    direction: "increase" | "decrease";
  }>;
}) {
  const coverIds: Id<"_storage">[] = goals
    .map((g) => g.coverImageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds } : "skip"
  );

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <Sparkles size={20} className="mx-auto mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          {displayNameForEmpty("goals")} hasn't created any public goals yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {goals.map((g) => {
        const progress = pct(g.currentValue, g.currentValue, g.targetValue, g.direction);
        const coverUrl = g.coverImageId
          ? coverUrls?.[g.coverImageId] ?? null
          : null;
        return (
          <Link
            key={g._id}
            href={`/o/${g.slug}`}
            className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-md"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)]">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : null}
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-700 backdrop-blur">
                <CategoryIcon category={g.category} size={10} />
                {g.category}
              </div>
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-zinc-900">
                {g.title}
              </h3>
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-zinc-600">
                  <span>
                    <span className="font-semibold text-zinc-900">
                      {formatNumber(g.currentValue)}
                    </span>{" "}
                    / {formatNumber(g.targetValue)} {g.unit}
                  </span>
                  <span className="text-zinc-500">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MotivationsList({
  motivations,
}: {
  motivations: Array<{
    _id: Id<"motivatorPledges">;
    role: string;
    checkInFrequency: string;
    pledgeText: string | null;
    isCoreMotivator: boolean;
    acceptedAt: number;
    goal: {
      _id: Id<"goals">;
      slug: string;
      title: string;
      summary: string | null;
      category: string;
      coverImageId: Id<"_storage"> | null;
      currentValue: number;
      targetValue: number;
      unit: string;
      direction: "increase" | "decrease";
      ownerName: string | null | undefined;
      ownerImage: string | null | undefined;
    };
  }>;
}) {
  const coverIds: Id<"_storage">[] = motivations
    .map((m) => m.goal.coverImageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds } : "skip"
  );

  if (motivations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <Heart size={20} className="mx-auto mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          {displayNameForEmpty("motivating")} isn't motivating any goals yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {motivations.map((m) => {
        const meta = ROLE_META[m.role] ?? ROLE_META.encourager;
        const coverUrl = m.goal.coverImageId
          ? coverUrls?.[m.goal.coverImageId] ?? null
          : null;
        return (
          <Link
            key={m._id}
            href={`/o/${m.goal.slug}`}
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)]">
                <CategoryIcon category={m.goal.category} size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <div className="truncate text-sm font-semibold text-zinc-900">
                  {m.goal.title}
                </div>
                {m.isCoreMotivator && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-primary-dark)]">
                    <Trophy size={8} />
                    Core circle
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                <span>·</span>
                <span>{FREQ_LABEL[m.checkInFrequency] ?? m.checkInFrequency}</span>
                <span>·</span>
                <span>by {m.goal.ownerName ?? "Someone"}</span>
              </div>
              {m.pledgeText && (
                <div className="mt-1 line-clamp-1 text-[11px] italic text-zinc-600">
                  "{m.pledgeText}"
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function displayNameForEmpty(_kind: string): string {
  // Hook for future personalisation. Keep as plain text for now.
  return "They";
}
