"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, ArrowRight, Grid3X3, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES, FEATURED_CATEGORIES, getCategory } from "@/lib/categories";
import { displayName, relativeTime } from "@/lib/format";
import { Header } from "@/components/Header";

type Tab = "goals" | "motivators" | "categories";

const TAB_META: Array<{ id: Tab; label: string }> = [
  { id: "goals", label: "Goals" },
  { id: "motivators", label: "Motivators" },
  { id: "categories", label: "Categories" },
];

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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />

      <section className="border-b border-[var(--color-border)]">
        <div className="shell-content px-5 pb-0 pt-14 sm:px-8 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-end"
          >
            <div>
              <p className="font-mono text-xs text-[var(--color-primary)]">Explore</p>
              <h1 className="mt-4 max-w-[13ch] text-balance font-display text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[var(--color-text)] sm:text-7xl">
                Find a goal worth showing up for.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
                Browse the work in progress, meet the people behind it, and offer the kind of support they asked for.
              </p>
            </div>
            <label className="block border-b border-[var(--color-text)] pb-3">
              <span className="block font-mono text-[11px] text-[var(--color-text-muted)]">Search this directory</span>
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
                className="mt-2 w-full bg-transparent text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)]"
              />
            </label>
          </motion.div>

          <div className="mt-10 flex items-center overflow-x-auto [scrollbar-width:none]">
            <div className="inline-flex gap-7">
              {TAB_META.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex shrink-0 items-center border-b-2 px-0 py-4 text-sm font-medium transition ${
                      active
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="shell-content px-5 py-8 sm:px-8 sm:py-12">
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
  const coverImageIds = useMemo(
    () =>
      Array.from(
        new Set(
          (goals ?? [])
            .map((goal: any) => goal.coverImageId)
            .filter(Boolean) as Id<"_storage">[]
        )
      ),
    [goals]
  );
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverImageIds.length > 0 ? { ids: coverImageIds } : "skip"
  );

  return (
    <div>
      <div className="mb-2 flex gap-6 overflow-x-auto border-b border-[var(--color-border)] [scrollbar-width:none]">
        <CategoryTab
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          label="All goals"
        />
        {FEATURED_CATEGORIES.map((c) => (
          <CategoryTab
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            label={c.label}
          />
        ))}
      </div>

      {goals === undefined ? (
        <SkeletonGrid />
      ) : goals.length === 0 ? (
        <div className="border-b border-[var(--color-border)] py-16">
          <p className="max-w-lg text-xl font-medium text-[var(--color-text)]">
            {query
              ? `No goals match “${query}”.`
              : activeCategory
              ? `No public ${getCategory(activeCategory).label.toLowerCase()} goals yet.`
              : "No public goals yet. Be the first."}
          </p>
        </div>
      ) : (
        <div>
          {goals.map((g: any, i: number) => (
            <ExploreGoalRow
              key={g._id}
              goal={g}
              index={i}
              coverUrl={
                g.coverImageId
                  ? coverUrls?.[g.coverImageId as Id<"_storage">] ?? undefined
                  : null
              }
            />
          ))}
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
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-6 py-16 text-center">
        <Users size={28} className="mb-3 text-[var(--color-text-dim)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">
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
              className="group block workspace-card p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-md"
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
                  <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {m.name ?? `@${m.handle}`}
                  </div>
                  {m.handle && (
                    <div className="truncate text-[11px] text-[var(--color-text-muted)]">@{m.handle}</div>
                  )}
                </div>
              </div>
              {m.bio && (
                <p className="mt-3 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{m.bio}</p>
              )}
              <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-border-subtle)] pt-3 text-[11px] text-[var(--color-text-muted)]">
                <span>
                  <span className="font-semibold text-[var(--color-text)]">{m.goalsCount}</span>{" "}
                  {m.goalsCount === 1 ? "goal" : "goals"}
                </span>
                <span>
                  <span className="font-semibold text-[var(--color-text)]">{m.motivatingCount}</span>{" "}
                  motivating
                </span>
                {m.supportersCount > 0 && (
                  <span>
                    <span className="font-semibold text-[var(--color-text)]">{m.supportersCount}</span>{" "}
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

  // useMemo MUST come before any early return — Rules of Hooks. The list
  // it returns doesn't depend on `counts` (only on `query` + the static
  // CATEGORIES constant), so it's safe to compute up front.
  const filtered = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    return CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [query]);

  if (counts === undefined) return <SkeletonGrid kind="category" />;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-6 py-16 text-center">
        <Grid3X3 size={28} className="mb-3 text-[var(--color-text-dim)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">No categories match “{query}”.</p>
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
              className="group flex items-center gap-4 workspace-card p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)] text-[var(--color-primary)]">
                <CategoryIcon category={c.id} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[var(--color-text)]">{c.label}</div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  {count} {count === 1 ? "goal" : "goals"}
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-[var(--color-text-dim)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
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

function CategoryTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative shrink-0 py-4 text-sm font-medium transition ${
        active
          ? "text-[var(--color-text)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--color-primary)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {label}
    </button>
  );
}

function ExploreGoalRow({
  goal,
  index,
  coverUrl,
}: {
  goal: any;
  index: number;
  coverUrl: string | null | undefined;
}) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress ?? 0)));
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
      className="border-b border-[var(--color-border)]"
    >
      <Link
        href={`/o/${goal.ownerHandle}/${goal.slug}`}
        className="group grid gap-4 py-7 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-5 sm:py-8 lg:grid-cols-[8rem_3rem_minmax(0,1fr)_8rem_9rem_2rem] lg:items-center"
      >
        {goal.coverImageId ? (
          <div className="relative aspect-[16/9] overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-sunken)] sm:aspect-[4/3]">
            {coverUrl === undefined ? (
              <div className="h-full w-full animate-pulse bg-[var(--color-bg-sunken)]" />
            ) : coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              />
            ) : (
              <div className="h-full w-full bg-[var(--color-bg-sunken)]" aria-hidden />
            )}
          </div>
        ) : (
          <div className="hidden aspect-[4/3] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] sm:block" aria-hidden />
        )}
        <div className="grid min-w-0 gap-4 lg:contents">
          <span className="font-mono text-xs text-[var(--color-text-dim)]">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] transition group-hover:text-[var(--color-primary)] sm:text-3xl">
              {goal.title}
            </h3>
            <p className="mt-2 line-clamp-1 text-sm text-[var(--color-text-muted)]">
              {goal.isAnonymous ? "Anonymous" : goal.ownerHandle ? `@${goal.ownerHandle}` : displayName(goal.ownerName)} · {relativeTime(goal.createdAt)}
            </p>
          </div>
          <span className="text-sm text-[var(--color-text-secondary)] lg:text-right">{formatCategory(goal.category)}</span>
          <div>
            <div className="flex items-center justify-between gap-3 font-mono text-xs text-[var(--color-text-muted)]">
              <span>Progress</span><span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-px bg-[var(--color-border-strong)]">
              <div className="h-px bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 font-mono text-[10px] text-[var(--color-text-dim)]">{goal.supporterCount ?? 0} showing up</p>
          </div>
          <span className="hidden text-right text-xl transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)] lg:block" aria-hidden>→</span>
        </div>
      </Link>
    </motion.article>
  );
}

function formatCategory(category?: string) {
  if (!category) return "Personal goal";
  return category.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function SkeletonGrid({ kind = "goal" }: { kind?: "goal" | "avatar" | "category" }) {
  if (kind === "avatar") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="workspace-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--color-bg-sunken)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-sunken)]" />
                <div className="h-2 w-16 animate-pulse rounded bg-[var(--color-bg-elev)]" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full animate-pulse rounded bg-[var(--color-bg-elev)]" />
              <div className="h-2 w-2/3 animate-pulse rounded bg-[var(--color-bg-elev)]" />
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
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-[var(--color-bg-elev)]" />
        ))}
      </div>
    );
  }
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid gap-4 border-b border-[var(--color-border)] py-7 sm:grid-cols-[3rem_1fr_10rem]">
          <div className="h-3 w-6 animate-pulse bg-[var(--color-bg-sunken)]" />
          <div className="space-y-3"><div className="h-5 max-w-sm animate-pulse bg-[var(--color-bg-sunken)]" /><div className="h-3 max-w-xs animate-pulse bg-[var(--color-bg-elev)]" /></div>
          <div className="h-3 animate-pulse bg-[var(--color-bg-sunken)]" />
        </div>
      ))}
    </div>
  );
}
