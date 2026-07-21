"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Heart,
  Trophy,
  Users,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { ProgressBar } from "@/components/ProgressBar";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES } from "@/lib/categories";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";

const FEATURED_CATEGORIES = CATEGORIES.slice(0, 6);

export default function HomePage() {
  const { user } = useCurrentUser();
  const recent = useQuery(api.public.listRecentPublic, { limit: 12 });
  const coverIds = useMemo(
    () =>
      Array.from(
        new Set((recent ?? []).map((g: any) => g.coverImageId).filter(Boolean))
      ),
    [recent]
  );
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds as any } : "skip"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let arr = (recent ?? []) as any[];
    if (activeCategory) arr = arr.filter((g) => g.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.summary || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [recent, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Top nav */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-bold text-white">
              m
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900">gomotivateme</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-zinc-600 transition hover:text-zinc-900"
                >
                  My goals
                </Link>
                <Link
                  href="/dashboard/new"
                  className="rounded-full bg-orange-500 px-4 py-1.5 font-medium text-white transition hover:bg-orange-600"
                >
                  New goal
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline text-zinc-600 transition hover:text-zinc-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-orange-500 px-4 py-1.5 font-medium text-white transition hover:bg-orange-600"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center sm:pt-28">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-balance text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl"
          >
            Where goals get the support
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              they need to happen.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-balance text-lg text-zinc-600 sm:text-xl"
          >
            Set a goal. Share a link. Build a team of people cheering you on with
            encouragement, accountability, and real support.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href={user ? "/dashboard/new" : "/signup"}
              className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-orange-600"
            >
              Start a goal
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#explore"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-900 transition hover:border-zinc-400"
            >
              Support someone
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-zinc-50">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
          <Stat
            label="Active goals"
            value={String(recent?.filter((g: any) => g.status === "active").length ?? 0)}
            sub="right now"
          />
          <Stat
            label="Cheer moments"
            value="2.4k+"
            sub="and counting"
          />
          <Stat
            label="Categories"
            value={String(CATEGORIES.length)}
            sub="from weight to writing"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Crowdsourcing motivation is easy
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-zinc-200 bg-white p-6"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Yellow CTA banner — GoFundMe style */}
      <section className="bg-amber-300 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Get the motivation you need to reach your goal
          </h2>
          <p className="mt-3 text-base text-zinc-800">
            From first steps to the finish line — encouragement, accountability,
            and people in your corner. Whatever you're working on, you're not
            doing it alone.
          </p>
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Start your goal
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Explore */}
      <section id="explore" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Discover active goals
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Real people. Real progress. Cheer them on.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search goals"
                className="w-full rounded-full border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="mb-6 flex flex-wrap gap-2">
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

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
              <p className="text-sm text-zinc-600">
                {recent === undefined
                  ? "Loading goals…"
                  : "No public goals in this category yet. Be the first."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((g: any, i: number) => (
                <motion.div
                  key={g._id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <Link
                    href={`/o/${g.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100">
                      {g.coverImageId && coverUrls?.[g.coverImageId] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrls[g.coverImageId]}
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
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
                        {g.title}
                      </h3>
                      {g.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{g.summary}</p>
                      )}
                      <div className="mt-2 text-xs text-zinc-500">
                        by {g.ownerName || "Someone"} · {relativeTime(g.createdAt)}
                      </div>
                      <div className="mt-3 space-y-2">
                        <MiniProgress
                          label="Goal"
                          pct={g.progress}
                          hint={`${formatNumber(g.currentValue)} / ${formatNumber(g.targetValue)} ${g.unit}`}
                        />
                        <MiniProgress
                          label="Supporters"
                          pct={
                            g.supporterTarget && g.supporterTarget > 0
                              ? Math.min(100, (g.supporterCount / g.supporterTarget) * 100)
                              : 0
                          }
                          hint={
                            g.supporterTarget
                              ? `${g.supporterCount} / ${g.supporterTarget}`
                              : `${g.supporterCount}`
                          }
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Dark CTA section */}
      <section className="bg-zinc-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            gomotivateme is a movement of people
            <br className="hidden sm:inline" />
            who refuse to do it alone.
          </h2>
          <p className="mt-4 text-base text-zinc-300">
            We make it easy to set a goal, share a link, and build the team that
            helps you show up. Whatever you're chasing — you don't have to chase
            it alone.
          </p>
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Start your goal
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 text-xs text-zinc-500">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
                  m
                </div>
                <span className="text-sm font-semibold text-zinc-900">gomotivateme</span>
              </div>
              <p>Crowdfund the encouragement you need to reach your goal.</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">Categories</p>
              <div className="grid grid-cols-2 gap-1">
                {CATEGORIES.slice(0, 8).map((c) => (
                  <a key={c.id} href="#explore" onClick={() => setActiveCategory(c.id)}>
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">About</p>
              <a href="#" className="block">How it works</a>
              <a href="#" className="block">Community guidelines</a>
              <a href="#" className="block">Contact</a>
            </div>
          </div>
          <p className="mt-8 border-t border-zinc-200 pt-6">
            © {new Date().getFullYear()} gomotivateme · Made for people who want to be cheered on.
          </p>
        </div>
      </footer>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Set a goal",
    body: "Pick a category, define what success looks like, and set a target date. Pick a number, a daily streak, or a milestone list.",
  },
  {
    title: "Share your link",
    body: "Get a public URL for your goal. Drop it in WhatsApp, Instagram, or text. Anyone can view it — no app required.",
  },
  {
    title: "Build your team",
    body: "Visitors pick how they want to help — encouragement, accountability, advice, or joining alongside you. They can make a real pledge.",
  },
];

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-zinc-900 sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>
    </div>
  );
}

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
          ? "border-orange-500 bg-orange-500 text-white"
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
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-zinc-500">{hint}</div>
    </div>
  );
}
