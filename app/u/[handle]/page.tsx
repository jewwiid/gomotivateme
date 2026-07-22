"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  Heart,
  Plus,
  Share2,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatNumber, relativeTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Tab = "activity" | "about";

const ROLE_META: Record<string, { label: string; color: string }> = {
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

function initialsOf(name: string | null | undefined, handle: string | null | undefined) {
  const src = (name ?? handle ?? "?").trim();
  return src
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle;
  const [tab, setTab] = useState<Tab>("activity");
  const { user: me } = useCurrentUser();
  const isMe = me?.handle === handle;

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
  const motivators = useQuery(api.users.listFeaturedMotivators, { limit: 8 });

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
  const initials = initialsOf(user.name, user.handle);
  const profileUrl =
    typeof window !== "undefined" && user.handle
      ? `${window.location.origin}/u/${user.handle}`
      : user.handle
      ? `/u/${user.handle}`
      : "";

  // Setup progress: 0/3 when avatar + bio + cover are all missing
  const setup = {
    avatar: Boolean(user.image),
    bio: Boolean(user.bio && user.bio.trim().length > 0),
    cover: Boolean(user.coverImageId),
  };
  const setupDone = Object.values(setup).filter(Boolean).length;
  const showSetup = isMe && setupDone < 3;

  // For "Discover more people" sidebar — exclude the current user.
  const otherMotivators = (motivators ?? [])
    .filter((m) => m.handle && m.handle !== user.handle)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {/* === GoFundMe-style header strip: cover (left) | name + stats + share (right) === */}
        <div className="-mt-px">
          <div className="overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-5">
              {/* Cover photo (left, taller than the text column) */}
              <div className="relative md:col-span-2">
                <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-dark)] to-[var(--color-accent)] sm:h-64 md:h-72">
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {isMe && (
                    <Link
                      href="/settings"
                      className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur transition hover:bg-white"
                    >
                      <Camera size={12} />
                      {coverImageUrl ? "Change cover" : "Add cover"}
                    </Link>
                  )}
                </div>
                {/* Curved bottom edge — visual flourish matching the GoFundMe silhouette */}
                <div
                  className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full bg-white"
                  style={{
                    clipPath: "ellipse(60% 100% at 50% 100%)",
                  }}
                />
              </div>

              {/* Name + handle + stats + share (right) */}
              <div className="relative flex flex-col gap-3 px-5 pb-6 pt-4 sm:px-8 sm:pt-6 md:col-span-3 md:py-10">
                <div className="flex items-start gap-4">
                  {/* Avatar floats up over the cover edge on mobile, sits inline on desktop */}
                  <div className="-mt-12 shrink-0 sm:-mt-16 md:hidden">
                    <ProfileAvatar
                      image={user.image}
                      initials={initials}
                      size={72}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                      {displayName}
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      @{user.handle ?? "no-handle-yet"}
                    </p>
                  </div>
                </div>

                {/* Avatar (desktop) — sits inline on the right, not floating over cover */}
                <div className="hidden md:block">
                  <ProfileAvatar
                    image={user.image}
                    initials={initials}
                    size={72}
                  />
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                  <span>
                    <span className="font-display text-lg font-bold tabular-nums text-zinc-900">
                      {formatNumber(stats.goalsCount)}
                    </span>{" "}
                    {stats.goalsCount === 1 ? "goal" : "goals"}
                  </span>
                  <span>
                    <span className="font-display text-lg font-bold tabular-nums text-zinc-900">
                      {formatNumber(stats.motivatingCount)}
                    </span>{" "}
                    motivating
                  </span>
                  <span>
                    <span className="font-display text-lg font-bold tabular-nums text-zinc-900">
                      {formatNumber(stats.supportersCount)}
                    </span>{" "}
                    supporters
                  </span>
                </div>

                {/* Share button — uses Web Share API if available, falls back to clipboard. */}
                {user.handle && (
                  <div className="flex items-center gap-2 pt-1">
                    <ShareProfileButton url={profileUrl} name={displayName} />
                    {isMe && (
                      <Link
                        href="/settings"
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
                      >
                        <Edit3 size={12} />
                        Edit profile
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === Setup progress card (own profile only, 0-2 of 3 done) === */}
        {showSetup && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-5 rounded-2xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-accent)]/10 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <Sparkles size={18} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    Let's set up your profile
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    <span className="font-mono tabular-nums">{setupDone}/3</span>{" "}
                    complete — {3 - setupDone} more to go
                  </div>
                </div>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                Set up
                <ChevronRight size={12} />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <SetupPill done={setup.avatar} label="Profile photo" />
              <SetupPill done={setup.bio} label="Bio / intro" />
              <SetupPill done={setup.cover} label="Cover photo" />
            </div>
          </motion.div>
        )}

        {/* === "What I care about" — bio card === */}
        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              What I care about
            </h2>
            {isMe && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
              >
                <Edit3 size={11} />
                {user.bio ? "Edit" : "Add intro"}
              </Link>
            )}
          </div>
          {user.bio ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {user.bio}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-zinc-500">
              {isMe
                ? "Add a short intro so people know what you're working on and why."
                : `${displayName} hasn't added an intro yet.`}
            </p>
          )}
        </section>

        {/* === Tabs + sidebar === */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="border-b border-zinc-200">
              <div className="flex gap-1">
                <TabButton
                  active={tab === "activity"}
                  onClick={() => setTab("activity")}
                  label="Activity"
                  count={goals.length + motivations.length}
                />
                <TabButton
                  active={tab === "about"}
                  onClick={() => setTab("about")}
                  label="About"
                />
              </div>
            </div>

            <div className="mt-6">
              {tab === "activity" && (
                <ActivityTab
                  goals={goals}
                  motivations={motivations}
                  displayName={displayName}
                />
              )}
              {tab === "about" && (
                <AboutTab
                  user={user}
                  stats={stats}
                  isMe={isMe}
                />
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <DiscoverSidebar motivators={otherMotivators} />
          </aside>
        </div>
      </main>
    </div>
  );
}

// =====================
// Sub-components
// =====================

function ProfileAvatar({
  image,
  initials,
  size = 72,
}: {
  image: string | null | undefined;
  initials: string;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full border-4 border-white object-cover shadow-md"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] font-bold text-white shadow-md"
    >
      {initials}
    </div>
  );
}

function SetupPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      {done ? <Check size={11} /> : <Plus size={11} />}
      {label}
    </span>
  );
}

function ShareProfileButton({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onShare = async () => {
    // Prefer native share sheet on mobile / supported browsers
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${name} on gomotivateme`,
          text: `Check out ${name}'s goals on gomotivateme`,
          url,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    // Fallback: copy URL
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1800);
      } catch {
        // clipboard denied — silently fail
      }
    }
  };

  return (
    <button
      onClick={onShare}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
      {copied ? "Copied!" : "Share profile"}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
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
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-600">
          {count}
        </span>
      )}
    </button>
  );
}

function ActivityTab({
  goals,
  motivations,
  displayName,
}: {
  goals: any[];
  motivations: any[];
  displayName: string;
}) {
  if (goals.length === 0 && motivations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <Sparkles size={20} className="mx-auto mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          No public activity yet. {displayName} will appear here as they
          start goals and motivate others.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {goals.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Target size={11} />
            Public goals
          </h3>
          <GoalsGrid goals={goals} />
        </div>
      )}
      {motivations.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Heart size={11} />
            Currently motivating
          </h3>
          <MotivationsList motivations={motivations} />
        </div>
      )}
    </div>
  );
}

function AboutTab({
  user,
  stats,
  isMe,
}: {
  user: {
    name: string | null;
    handle: string | null;
    bio: string | null;
    image: string | null;
    coverImageId: string | null;
  };
  stats: { goalsCount: number; motivatingCount: number; supportersCount: number };
  isMe: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">About</h3>
        {user.bio ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            {user.bio}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-zinc-500">
            {isMe
              ? "Add a short bio on the settings page."
              : "No intro yet."}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Stats</h3>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <StatPill label="Goals" value={stats.goalsCount} />
          <StatPill label="Motivating" value={stats.motivatingCount} />
          <StatPill label="Supporters" value={stats.supportersCount} />
        </dl>
      </section>

      {isMe && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">
            Edit your profile
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Cover photo, avatar, bio, and handle all live in settings.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            <Edit3 size={12} />
            Open settings
          </Link>
        </section>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="font-display text-xl font-bold tabular-nums text-zinc-900">
        {formatNumber(value)}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function DiscoverSidebar({
  motivators,
}: {
  motivators: Array<{
    _id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
    bio: string | null;
    goalsCount: number;
    motivatingCount: number;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-900">
        Discover more people
      </h3>
      <p className="mt-1 text-[11px] text-zinc-500">
        Active motivators on gomotivateme
      </p>
      <ul className="mt-4 space-y-3">
        {motivators.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-[11px] text-zinc-500">
            New motivators show up here as the community grows.
          </li>
        ) : (
          motivators.map((m) => {
            const initials = initialsOf(m.name, m.handle);
            return (
              <li key={m._id}>
                <Link
                  href={m.handle ? `/u/${m.handle}` : "#"}
                  className="group flex items-center gap-3"
                >
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-900 group-hover:text-[var(--color-primary)]">
                      {m.name ?? `@${m.handle}`}
                    </div>
                    <div className="truncate text-[10px] text-zinc-500">
                      {m.goalsCount} {m.goalsCount === 1 ? "goal" : "goals"} ·{" "}
                      {m.motivatingCount} motivating
                    </div>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
      <Link
        href="/explore?tab=motivators"
        className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
      >
        See all motivators
        <ChevronRight size={11} />
      </Link>
    </div>
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
    createdAt?: number;
  }>;
}) {
  const coverIds: Id<"_storage">[] = goals
    .map((g) => g.coverImageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds } : "skip"
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
              <h4 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-zinc-900">
                {g.title}
              </h4>
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

  return (
    <ul className="space-y-3">
      {motivations.map((m) => {
        const meta = ROLE_META[m.role] ?? ROLE_META.encourager;
        const coverUrl = m.goal.coverImageId
          ? coverUrls?.[m.goal.coverImageId] ?? null
          : null;
        return (
          <li key={m._id}>
            <Link
              href={`/o/${m.goal.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)]">
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
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                  <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                  <span>·</span>
                  <span>{FREQ_LABEL[m.checkInFrequency] ?? m.checkInFrequency}</span>
                  <span>·</span>
                  <span>by {m.goal.ownerName ?? "Someone"}</span>
                  <span>·</span>
                  <span>joined {relativeTime(m.acceptedAt)}</span>
                </div>
                {m.pledgeText && (
                  <div className="mt-1 line-clamp-1 text-[11px] italic text-zinc-600">
                    "{m.pledgeText}"
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
