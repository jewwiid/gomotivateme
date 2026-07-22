"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Sparkles, Users, ArrowRight, Grid3X3, Target, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES, FEATURED_CATEGORIES, getCategory } from "@/lib/categories";
import { formatNumber, relativeTime } from "@/lib/format";
import { Header } from "@/components/Header";

type Tab = "goals" | "motivators" | "categories";

const TAB_META: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "goals", label: "Goals", icon: <Target size={14} /> },
  { id: "motivators", label: "Motivators", icon: <Users size={14} /> },
  { id: "categories", label: "Categories", icon: <Grid3X3 size={14} /> },
];

const SUPPORT_LABEL: Record<string, string> = {
  encourage: "Encouragement",
  experience: "Shared experience",
  advice: "Advice",
  checkin: "Check-ins",
  join: "Joining in",
};

const VALID_TABS: Tab[] = ["goals", "motivators", "categories"];

export function ExploreContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTabRaw = params.get("tab") as Tab | null;
  const initialTab: Tab = initialTabRaw && VALID_TABS.includes(initialTabRaw) ? initialTabRaw : "goals";
  const initialCategory = params.get("category") ?? null;
  const initialQuery = params.get("q") ?? "";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [search, setSearch] = useState(initialQuery);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery);

  // Debounce the search box so the URL + Convex query don't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Sync state → URL (replace, not push, so back button doesn't fill up
  // with every keystroke).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (tab !== "goals") sp.set("tab", tab);
    if (activeCategory) sp.set("category", activeCategory);
    if (debouncedQ) sp.set("q", debouncedQ);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeCategory, debouncedQ]);

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />

      {/* Page hero — title, subtitle, search bar */}
      <section>
        <div className="mx-auto max-w-[80rem] px-5 py-14 sm:px-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl"
          >
            <p className="brand-kicker">Find a goal to stand behind</p>
            <h1
              className="mt-3 font-display text-balance text-5xl font-bold leading-[0.93] tracking-[-0.06em] text-[#292929] sm:text-7xl"
            >
              Small steps. Real people.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#686963] sm:text-lg">
              Browse public goals, follow motivators, or jump into a category that fits you.
            </p>
          </motion.div>

          <div className="mt-8 max-w-xl">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "goals"
                    ? "Search goals, owners, or keywords…"
                    : tab === "motivators"
                    ? "Search by name or handle…"
                    : "Search categories…"
                }
                className="w-full rounded-xl border border-[#c9c8c0] bg-transparent py-3.5 pl-11 pr-4 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
              />
            </div>
          </div>

          {/* Tab bar — pill style, single-select */}
          <div className="mt-10 flex items-center">
            <div className="inline-flex gap-5 border-b border-[#deddd6]">
              {TAB_META.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 -mb-px border-b-2 px-0 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-transparent text-[#777872] hover:text-[#33332f]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[80rem] px-5 py-8 sm:px-8 sm:py-12">
        {tab === "goals" && (
          <GoalsTab
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            query={debouncedQ}
          />
        )}
        {tab === "motivators" && <MotivatorsTab query={debouncedQ} />}
        {tab === "categories" && <CategoriesTab query={debouncedQ} />}
      </main>
    </div>
  );
}

// =====================
// Goals tab
// =====================

function GoalsTab({
  activeCategory,
  setActiveCategory,
  query,
}: {
  activeCategory: string | null;
  setActiveCategory: (c: string | null) => void;
  query: string;
}) {
  const goals = useQuery(api.public.searchPublicGoals, {
    query: query || undefined,
    category: activeCategory ?? undefined,
    limit: 60,
  });

  const coverIds = useMemo(
    () =>
      Array.from(
        new Set((goals ?? []).map((g: any) => g.coverImageId).filter(Boolean))
      ),
    [goals]
  );
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds as any } : "skip"
  );

  return (
    <div>
      {/* Category pills — uses the featured set so the row doesn't scroll
          horizontally on mobile. "All" is always first. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CategoryPill
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          label="All"
        />
        {FEATURED_CATEGORIES.map((c) => (
          <CategoryPill
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            label={c.label}
            icon={<CategoryIcon category={c.id} size={12} />}
          />
        ))}
      </div>

      {goals === undefined ? (
        <SkeletonGrid />
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center border-y border-dashed border-[#c9c8c0] px-6 py-16 text-center">
          <Sparkles size={28} className="mb-3 text-zinc-400" />
          <p className="text-sm text-zinc-600">
            {query
              ? `No goals match “${query}”.`
              : activeCategory
              ? `No public ${getCategory(activeCategory).label.toLowerCase()} goals yet.`
              : "No public goals yet. Be the first."}
          </p>
        </div>
      ) : (
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {goals.map((g: any, i: number) => {
            const coverUrl = g.coverImageId ? coverUrls?.[g.coverImageId] : null;
            return (
              <motion.div
                key={g._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
              >
                <Link
                  href={`/o/${g.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[1.4/1] w-full overflow-hidden rounded-[1rem] bg-[#e8edf9]">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4d4e49] backdrop-blur">
                      <CategoryIcon category={g.category} size={10} />
                      {g.category}
                    </div>
                  </div>
                  <div className="px-1 pt-3">
                    <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug tracking-[-0.035em] text-[#292929]">
                      {g.title}
                    </h3>
                    {g.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{g.summary}</p>
                    )}
                    <div className="mt-2 text-xs text-zinc-500">
                      {g.ownerHandle ? (
                        <span className="font-medium text-zinc-700">@{g.ownerHandle}</span>
                      ) : (
                        <span>{g.ownerName || "Someone"}</span>
                      )}
                      <span className="mx-1.5">·</span>
                      <span>{relativeTime(g.createdAt)}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <MiniProgress
                        label="Goal"
                        pct={g.progress}
                        hint={`${formatNumber(g.currentValue)} / ${formatNumber(g.targetValue)} ${g.unit}`}
                      />
                      {g.supporterTarget ? (
                        <MiniProgress
                          label="Supporters"
                          pct={Math.min(100, (g.supporterCount / g.supporterTarget) * 100)}
                          hint={`${g.supporterCount} / ${g.supporterTarget}`}
                        />
                      ) : (
                        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-zinc-500">
                          <span>Supporters</span>
                          <span className="font-mono tabular-nums text-zinc-700">
                            {g.supporterCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {g.supportTypes && g.supportTypes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {g.supportTypes.slice(0, 3).map((t: string) => (
                          <span
                            key={t}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                          >
                            {SUPPORT_LABEL[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================
// Motivators tab
// =====================

function MotivatorsTab({ query }: { query: string }) {
  const motivators = useQuery(api.users.listFeaturedMotivators, { limit: 36 });

  const filtered = useMemo(() => {
    if (!motivators) return undefined;
    if (!query.trim()) return motivators;
    const q = query.toLowerCase();
    return motivators.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.handle ?? "").toLowerCase().includes(q) ||
        (m.bio ?? "").toLowerCase().includes(q)
    );
  }, [motivators, query]);

  if (filtered === undefined) {
    return <SkeletonGrid kind="avatar" />;
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center">
        <Users size={28} className="mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          {query
            ? `No motivators match “${query}”.`
            : "No motivators yet. Be the first to start a goal."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filtered.map((m, i) => {
        const initials = (m.name ?? m.handle ?? "?")
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <motion.div
            key={m._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }}
          >
            <Link
              href={m.handle ? `/@${m.handle}` : "#"}
              className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-sm font-bold text-white">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-900">
                    {m.name ?? `@${m.handle}`}
                  </div>
                  {m.handle && (
                    <div className="truncate text-[11px] text-zinc-500">@{m.handle}</div>
                  )}
                </div>
              </div>
              {m.bio && (
                <p className="mt-3 line-clamp-2 text-xs text-zinc-600">{m.bio}</p>
              )}
              <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
                <span>
                  <span className="font-semibold text-zinc-900">{m.goalsCount}</span>{" "}
                  {m.goalsCount === 1 ? "goal" : "goals"}
                </span>
                <span>
                  <span className="font-semibold text-zinc-900">{m.motivatingCount}</span>{" "}
                  motivating
                </span>
                {m.supportersCount > 0 && (
                  <span>
                    <span className="font-semibold text-zinc-900">{m.supportersCount}</span>{" "}
                    supporters
                  </span>
                )}
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] opacity-0 transition group-hover:opacity-100">
                View profile
                <ChevronRight size={11} />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// =====================
// Categories tab
// =====================

function CategoriesTab({ query }: { query: string }) {
  const counts = useQuery(api.public.countByCategory, {});

  if (counts === undefined) return <SkeletonGrid kind="category" />;

  const filtered = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    return CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [query]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center">
        <Grid3X3 size={28} className="mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-600">No categories match “{query}”.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((c, i) => {
        const count = counts[c.id] ?? 0;
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }}
          >
            <Link
              href={`/explore?tab=goals&category=${c.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)] text-[var(--color-primary)]">
                <CategoryIcon category={c.id} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-900">{c.label}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {count} {count === 1 ? "goal" : "goals"}
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
              />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// =====================
// Shared bits
// =====================

function CategoryPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniProgress({
  label,
  pct,
  hint,
}: {
  label: string;
  pct: number;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-zinc-700">{Math.round(pct)}%</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-zinc-500">{hint}</div>
    </div>
  );
}

function SkeletonGrid({ kind = "goal" }: { kind?: "goal" | "avatar" | "category" }) {
  if (kind === "avatar") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-2 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-2 w-2/3 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "category") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="aspect-[16/9] animate-pulse bg-zinc-100" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
            <div className="mt-3 h-1.5 w-full animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
