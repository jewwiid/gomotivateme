"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES, FEATURED_CATEGORIES } from "@/lib/categories";
import { formatNumber, relativeTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";

const SUPPORT_TYPE_META: Array<{
  id: string;
  label: string;
  description: string;
  iconSrc: string;
  color: string;
}> = [
  {
    id: "encourage",
    label: "Encouragement",
    description: "Cheer them on when motivation dips",
    iconSrc: "/illustrations/support/encourage.png",
    color: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  },
  {
    id: "advice",
    label: "Practical advice",
    description: "Specific tips, resources, know-how",
    iconSrc: "/illustrations/support/advice.png",
    color: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  },
  {
    id: "checkin",
    label: "Regular check-ins",
    description: "Keep them accountable on a schedule",
    iconSrc: "/illustrations/support/checkin.png",
    color: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  },
  {
    id: "join",
    label: "Join me",
    description: "Set your own version of the same goal",
    iconSrc: "/illustrations/support/join.png",
    color: "bg-[var(--color-accent-soft)] text-[var(--color-primary-dark)]",
  },
];

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
    <div className="min-h-screen bg-[var(--color-bg)] text-zinc-900">
      {/* Top nav */}
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-xs font-bold text-white">
              m
            </div>
            <span className="font-display text-base font-semibold tracking-tight">gomotivateme</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="#explore" className="hidden text-zinc-700 transition hover:text-zinc-900 sm:inline">
              Explore
            </Link>
            <Link href="#how-it-works" className="hidden text-zinc-700 transition hover:text-zinc-900 sm:inline">
              How it works
            </Link>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-zinc-700 transition hover:text-zinc-900"
                >
                  My goals
                </Link>
                <Link
                  href="/dashboard/new"
                  className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
                >
                  New goal
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-zinc-700 transition hover:text-zinc-900 sm:inline"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
                >
                  Start a goal
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/8 blur-3xl" />
        {/* Hero illustration — full-bleed, sitting behind the headline on desktop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/hero.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -top-6 left-1/2 hidden w-full max-w-6xl -translate-x-1/2 select-none opacity-90 mix-blend-multiply lg:block"
        />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-12 text-center sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-white/80 px-3 py-1 text-xs font-medium text-[var(--color-primary)]"
          >
            <Sparkles size={12} />
            Motivation works better together
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-balance text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl md:text-[68px]"
            style={{ lineHeight: 1.02, letterSpacing: "-0.03em" }}
          >
            Where personal goals
            <br />
            <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
              gain momentum.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-balance text-lg text-zinc-600 sm:text-xl"
          >
            Share what you want to achieve, document your progress and build a
            community that keeps you moving.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href={user ? "/dashboard/new" : "/signup"}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              Start your goal
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#explore"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-900 transition hover:border-zinc-400"
            >
              Explore goals
            </a>
          </motion.div>
        </div>
        {/* Mobile-only hero illustration: tucked under the CTA, full-width strip. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/hero.png"
          alt=""
          aria-hidden
          className="pointer-events-none mx-auto -mb-12 block w-full max-w-3xl select-none opacity-90 mix-blend-multiply lg:hidden"
        />
      </section>

      {/* Platform promise */}
      <section className="border-y border-zinc-200 bg-white py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            You bring the goal.
            <br />
            Your community brings the momentum.
          </h2>
          <p className="mt-3 text-base text-zinc-600">
            Whether you're building a habit, learning a skill, or creating something new — the
            right people can help you stay committed.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/illustrations/steps/${step.icon}.png`}
                  alt=""
                  aria-hidden
                  width={96}
                  height={96}
                  className="mb-3 h-16 w-16 select-none object-contain"
                />
                <h3 className="text-sm font-semibold text-zinc-900">{step.title}</h3>
                <p className="mt-1.5 text-xs text-zinc-600">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Support types */}
      <section className="border-t border-zinc-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              More than a like
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Real support, in the form that actually helps.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUPPORT_TYPE_META.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.iconSrc}
                  alt=""
                  aria-hidden
                  width={120}
                  height={120}
                  className="mb-3 h-20 w-20 select-none object-contain"
                />
                <h3 className="text-sm font-semibold text-zinc-900">{s.label}</h3>
                <p className="mt-1 text-xs text-zinc-600">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore */}
      <section id="explore" className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Live goals
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Real people, real progress. Show up for them.
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
                className="w-full rounded-full border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </div>

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
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/illustrations/empty-state.png"
                alt=""
                aria-hidden
                width={160}
                height={160}
                className="mb-6 h-32 w-32 select-none object-contain sm:h-40 sm:w-40"
              />
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
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-soft)]">
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
                      <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-zinc-900">
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
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bright CTA */}
      <section className="bg-[var(--color-accent-soft)] py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Someone's next breakthrough
            <br />
            may start with your message.
          </h2>
          <p className="mt-3 text-base text-zinc-700">
            Even a short note can be the thing that gets someone back to work.
          </p>
          <Link
            href="#explore"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Show up for someone
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Dark trust section */}
      <section className="bg-[var(--color-primary-dark)] py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A healthier place
            <br className="hidden sm:inline" />
            to pursue real progress.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { title: "Moderated", body: "Reporting, blocking, and community rules keep it safe." },
              { title: "Private by choice", body: "Pause, hide, or unlist a goal whenever you need." },
              { title: "No failure labels", body: "Reframe, extend, or close — never 'failed'." },
            ].map((it) => (
              <div key={it.title}>
                <div className="text-sm font-semibold text-[var(--color-accent)]">
                  {it.title}
                </div>
                <p className="mt-1.5 text-sm text-zinc-300">{it.body}</p>
              </div>
            ))}
          </div>
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--color-primary-dark)] transition hover:bg-zinc-100"
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
                <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-xs font-bold text-white">
                  m
                </div>
                <span className="font-display text-sm font-semibold text-zinc-900">gomotivateme</span>
              </div>
              <p>Where personal goals gain momentum.</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">Explore</p>
              <div className="grid grid-cols-2 gap-1">
                {FEATURED_CATEGORIES.map((c) => (
                  <a
                    key={c.id}
                    href="#explore"
                    onClick={() => setActiveCategory(c.id)}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">About</p>
              <a href="#how-it-works" className="block">How it works</a>
              <a href="#" className="block">Community guidelines</a>
              <a href="#" className="block">Contact</a>
            </div>
          </div>
          <p className="mt-8 border-t border-zinc-200 pt-6">
            © {new Date().getFullYear()} gomotivateme · Where personal goals gain momentum.
          </p>
        </div>
      </footer>
    </div>
  );
}

const HOW_IT_WORKS = [
  { title: "Set a meaningful goal", icon: "set", body: "Pick a category, set a target, choose the support you need." },
  { title: "Build your team", icon: "team", body: "Share your link. People who care join your support team." },
  { title: "Share progress", icon: "share", body: "Log values, milestones, photos, and reflections as you go." },
  { title: "Reach it together", icon: "track", body: "Real encouragement + accountability + check-ins to the finish." },
];

const SUPPORT_LABEL: Record<string, string> = {
  encourage: "Encouragement",
  experience: "Shared experience",
  advice: "Advice",
  checkin: "Check-ins",
  join: "Joining in",
};

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
