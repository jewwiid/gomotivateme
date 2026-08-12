"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, ArrowRight, Grid3X3, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PublicGoalCard } from "@/components/PublicGoalCard";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { JOURNEY_ILLUSTRATIONS } from "@/lib/journeyIllustrations";
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

  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "goals";
  const activeCategory = params.get("category") ?? null;
  const initialQuery = params.get("q") ?? "";

  const [search, setSearch] = useState(initialQuery);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery);

  // Debounce the search box so the URL + Convex query don't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Search is the only locally buffered filter. Tab and category are derived
  // directly from the URL so links, refreshes, and browser history cannot
  // leave the visible results out of sync with the address bar.
  useEffect(() => {
    if ((params.get("q") ?? "") === debouncedQ) return;
    const sp = new URLSearchParams(params.toString());
    if (debouncedQ) sp.set("q", debouncedQ);
    else sp.delete("q");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQ, params, pathname, router]);

  function setExploreLocation(nextTab: Tab, nextCategory = activeCategory) {
    const sp = new URLSearchParams(params.toString());
    if (nextTab === "goals") sp.delete("tab");
    else sp.set("tab", nextTab);
    if (nextCategory) sp.set("category", nextCategory);
    else sp.delete("category");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />

      <section className="px-5 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-16">
        <div className="shell-content overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)] px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid items-center gap-10 lg:grid-cols-[1fr_23rem]"
          >
            <div>
              <p className="inline-flex border-l-2 border-[var(--color-sun)] py-1 pl-3 text-xs font-semibold text-[var(--color-primary)]">Explore</p>
              <h1 className="mt-5 max-w-[13ch] text-balance font-display text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[var(--color-text)] sm:text-6xl">
                Find a goal worth showing up for.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
                Browse the work in progress, meet the people behind it, and offer the kind of support they asked for.
              </p>
            </div>
            <div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-[var(--color-surface)]">
                <Image src={JOURNEY_ILLUSTRATIONS.support.src} alt={JOURNEY_ILLUSTRATIONS.support.alt} fill priority sizes="368px" className="object-cover mix-blend-multiply" />
              </div>
              <label className="relative -mt-5 block rounded-[1.15rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_20px_45px_-34px_rgba(55,47,35,0.5)]">
                <span className="block font-mono text-[10px] text-[var(--color-text-muted)]">Search this directory</span>
                <span className="mt-1 flex items-center gap-2">
                  <Search size={16} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === "goals" ? "Goals, people, or keywords…" : tab === "motivators" ? "Name or handle…" : "Search categories…"}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)]"
                  />
                </span>
              </label>
            </div>
          </motion.div>

          <div className="mt-9 flex items-center overflow-x-auto [scrollbar-width:none]">
            <div className="inline-flex gap-2 rounded-full bg-[var(--color-surface)] p-1.5">
              {TAB_META.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setExploreLocation(t.id)}
                    className={`inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                      active
                        ? "bg-[var(--color-text)] text-white"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
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

      <main className="shell-content px-5 pb-20 pt-5 sm:px-8 sm:pb-28 sm:pt-8">
        {tab === "goals" && (
          <GoalsTab
            activeCategory={activeCategory}
            setActiveCategory={(category) => setExploreLocation("goals", category)}
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

  return (
    <div>
      <div className="mb-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] xl:flex-wrap xl:overflow-visible">
        <CategoryTab
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          label="All goals"
        />
        {CATEGORIES.map((c) => (
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
        <div className="grid overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-elev)] sm:grid-cols-[1fr_18rem]">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-9">
            <p className="text-xs font-semibold text-[var(--color-primary)]">A clear trail starts here</p>
            <p className="mt-3 max-w-lg text-balance font-display text-2xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
              {query
                ? `No goals match “${query}”.`
                : activeCategory
                ? `No public ${getCategory(activeCategory).label.toLowerCase()} goals yet.`
                : "No public goals yet. Be the first."}
            </p>
            <Link href="/dashboard/new" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]">
              Start a goal <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          <div className="relative hidden min-h-64 sm:block">
            <Image src={JOURNEY_ILLUSTRATIONS.begin.src} alt="" fill sizes="288px" className="object-cover mix-blend-multiply" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {goals.map((goal: any, index: number) => (
            <PublicGoalCard key={goal._id} goal={goal} index={index} />
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
              className="group block h-full rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border)] hover:shadow-[0_26px_60px_-42px_rgba(55,47,35,0.5)]"
            >
              <div className="flex items-center gap-3">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] text-sm font-bold text-white shadow-sm">
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
              <div className="mt-5 grid grid-cols-2 divide-x divide-[var(--color-border)] border-y border-[var(--color-border)] py-3 text-[11px] text-[var(--color-text-muted)]">
                <span>
                  <span className="block text-base font-semibold text-[var(--color-text)]">{m.goalsCount}</span>
                  {m.goalsCount === 1 ? "goal" : "goals"}
                </span>
                <span className="pl-4">
                  <span className="block text-base font-semibold text-[var(--color-text)]">{m.motivatingCount}</span>
                  motivating
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                View their journey
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
        const illustrations = [
          JOURNEY_ILLUSTRATIONS.begin,
          JOURNEY_ILLUSTRATIONS.move,
          JOURNEY_ILLUSTRATIONS.support,
          JOURNEY_ILLUSTRATIONS.milestone,
        ];
        const illustration = illustrations[i % illustrations.length];
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }}
          >
            <Link
              href={`/explore?tab=goals&category=${c.id}`}
              className="group grid h-full grid-cols-[7rem_1fr] overflow-hidden rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border)] hover:shadow-[0_26px_60px_-42px_rgba(55,47,35,0.5)]"
            >
              <div className="relative min-h-36 overflow-hidden bg-[var(--color-bg-elev)]">
                <Image src={illustration.src} alt="" fill sizes="112px" className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="flex min-w-0 items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <CategoryIcon category={c.id} size={18} />
                  </div>
                  <div className="mt-3 font-display text-xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">{c.label}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {count} {count === 1 ? "public goal" : "public goals"}
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-[var(--color-text-dim)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
              </div>
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
      className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
        active
          ? "bg-[var(--color-text)] text-white"
          : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
      }`}
    >
      {label}
    </button>
  );
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
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <div className="aspect-[16/10] animate-pulse bg-[var(--color-bg-elev)]" />
          <div className="space-y-4 p-6">
            <div className="h-7 w-3/4 animate-pulse rounded-full bg-[var(--color-bg-sunken)]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--color-bg-elev)]" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--color-bg-elev)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
