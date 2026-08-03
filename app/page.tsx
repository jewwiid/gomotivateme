"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FEATURED_CATEGORIES } from "@/lib/categories";
import { relativeTime, displayName } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Header } from "@/components/Header";

const easeOut = [0.16, 1, 0.3, 1] as const;

const HERO_SLIDES = [
  { src: "/illustrations/hero-community-v3.webp", alt: "People supporting each other's goals" },
  { src: "/illustrations/motivation-circle-v3.webp", alt: "Your motivation circle" },
  { src: "/illustrations/steps/together-v3.webp", alt: "Working together toward a goal" },
  { src: "/illustrations/steps/share-v3.webp", alt: "Sharing progress with your team" },
];

export default function HomePage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const recent = useQuery(api.public.listRecentPublic, { limit: 12 });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const coverImageIds = useMemo(
    () =>
      Array.from(
        new Set(
          (recent ?? [])
            .map((goal: any) => goal.coverImageId)
            .filter(Boolean) as Id<"_storage">[]
        )
      ),
    [recent]
  );
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverImageIds.length > 0 ? { ids: coverImageIds } : "skip"
  );

  const filteredGoals = useMemo(() => {
    let goals = (recent ?? []) as any[];
    if (activeCategory) goals = goals.filter((goal) => goal.category === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      goals = goals.filter(
        (goal) =>
          goal.title.toLowerCase().includes(query) ||
          (goal.summary ?? "").toLowerCase().includes(query) ||
          (goal.ownerName ?? "").toLowerCase().includes(query)
      );
    }
    return goals.slice(0, 6);
  }, [activeCategory, recent, searchQuery]);

  const startGoalHref = user ? "/dashboard/new" : "/signup";

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />

      <main>
        <section className="px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28">
          <div className="shell-bleed grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7 lg:pr-8">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: easeOut }}
                className="font-mono text-xs font-medium text-[var(--color-primary)]"
              >
                A public home for personal goals
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.05, ease: easeOut }}
                className="mt-6 max-w-[12ch] text-balance font-display text-[clamp(3.4rem,7.2vw,7rem)] font-semibold leading-[0.88] tracking-[-0.065em]"
              >
                Goals are harder to quit when people show up.
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: easeOut }}
                className="mt-8 grid max-w-2xl gap-7 border-t border-[var(--color-border)] pt-7 sm:grid-cols-[1fr_auto] sm:items-end"
              >
                <p className="max-w-[34rem] text-pretty text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
                  Give your goal one clear page. Post the work as it happens, and let the people you trust keep you moving.
                </p>
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                  <Link
                    href={startGoalHref}
                    className="inline-flex min-h-12 items-center bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] active:translate-y-0"
                  >
                    Start a goal <span className="ml-3" aria-hidden>→</span>
                  </Link>
                  <a
                    href="#explore"
                    className="inline-flex min-h-12 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    See public goals
                  </a>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: easeOut }}
              className="relative lg:col-span-5"
            >
              <div className="absolute -right-5 -top-5 h-16 w-16 bg-[var(--color-primary)] sm:-right-8 sm:-top-8 sm:h-24 sm:w-24" aria-hidden />
              <HeroCarousel />
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 border-y border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-20 sm:px-8 sm:py-28">
          <div className="shell-content grid gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
            <div>
              <p className="font-mono text-xs text-[var(--color-primary)]">How it works</p>
              <h2 className="mt-5 max-w-[13ch] text-balance font-display text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl">
                Give the work somewhere to live.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-[var(--color-text-secondary)]">
                Not another private checklist. A living record of the target, the setbacks, and the people who helped you through them.
              </p>
            </div>

            <ol className="border-t border-[var(--color-border-strong)]">
              {[
                ["01", "Name the real goal", "Set the target, deadline, milestones, and the reason you care about finishing."],
                ["02", "Choose your kind of support", "Ask for encouragement, advice, check-ins, or someone to do the work alongside you."],
                ["03", "Leave an honest trail", "Post wins and difficult weeks. Progress is more useful when it looks like real life."],
              ].map(([number, title, body]) => (
                <li key={number} className="grid gap-4 border-b border-[var(--color-border-strong)] py-7 sm:grid-cols-[4rem_1fr] sm:gap-6 sm:py-8">
                  <span className="font-mono text-xs text-[var(--color-primary)]">{number}</span>
                  <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:gap-8">
                    <h3 className="text-xl font-semibold tracking-[-0.025em]">{title}</h3>
                    <p className="max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="explore" className="scroll-mt-28 px-5 py-20 sm:px-8 sm:py-28">
          <div className="shell-content">
            <div className="grid gap-8 border-b border-[var(--color-border-strong)] pb-8 lg:grid-cols-[1fr_24rem] lg:items-end">
              <div>
                <p className="font-mono text-xs text-[var(--color-primary)]">Open goals</p>
                <h2 className="mt-4 text-balance font-display text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl">
                  See what people are working on.
                </h2>
              </div>
              <label className="block border-b border-[var(--color-text)] pb-3">
                <span className="block font-mono text-[11px] text-[var(--color-text-muted)]">Search public goals</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Type a goal, person, or topic"
                  className="mt-2 w-full bg-transparent text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)]"
                />
              </label>
            </div>

            <div className="flex gap-6 overflow-x-auto border-b border-[var(--color-border)] [scrollbar-width:none]">
              <CategoryFilter active={activeCategory === null} label="All goals" onClick={() => setActiveCategory(null)} />
              {FEATURED_CATEGORIES.map((category) => (
                <CategoryFilter
                  key={category.id}
                  active={activeCategory === category.id}
                  label={category.label}
                  onClick={() => router.push(`/explore?tab=goals&category=${category.id}`)}
                />
              ))}
            </div>

            {recent === undefined ? (
              <div aria-label="Loading public goals">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="grid animate-pulse gap-4 border-b border-[var(--color-border)] py-7 sm:grid-cols-[3rem_1fr_9rem]">
                    <div className="h-3 w-6 bg-[var(--color-bg-sunken)]" />
                    <div className="space-y-3"><div className="h-5 max-w-sm bg-[var(--color-bg-sunken)]" /><div className="h-3 max-w-xs bg-[var(--color-bg-sunken)]" /></div>
                    <div className="h-3 bg-[var(--color-bg-sunken)]" />
                  </div>
                ))}
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="border-b border-[var(--color-border)] py-16">
                <p className="max-w-lg text-xl font-medium">No public goals match that search.</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Try a broader term, or put the first goal in this category on the board.</p>
                <Link href={startGoalHref} className="mt-7 inline-block border-b border-[var(--color-primary)] pb-1 text-sm font-semibold text-[var(--color-primary)]">Start a goal →</Link>
              </div>
            ) : (
              <div>
                {filteredGoals.map((goal: any, index) => (
                  <GoalRow
                    key={goal._id}
                    goal={goal}
                    index={index}
                    coverUrl={
                      goal.coverImageId
                        ? coverUrls?.[goal.coverImageId as Id<"_storage">] ?? undefined
                        : null
                    }
                  />
                ))}
              </div>
            )}

            <Link
              href="/explore"
              className="mt-8 inline-flex min-h-11 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Browse every public goal <span className="ml-3" aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="border-y border-[#27312d] bg-[#121816] px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="shell-content grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-xs text-[#8cabff]">Ready when the goal is real</p>
              <h2 className="mt-5 max-w-[15ch] text-balance font-display text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl">
                Don&apos;t let it disappear in a private note.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#b8c1bd]">
                Put the plan somewhere your people can find it—and come back when you need them.
              </p>
            </div>
            <Link
              href={startGoalHref}
              className="inline-flex min-h-13 w-fit items-center bg-[#6f91ff] px-6 text-sm font-semibold text-[#0d1411] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
            >
              Make your goal public <span className="ml-4" aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function GoalRow({
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="border-b border-[var(--color-border)]"
    >
      <Link
        href={`/o/${goal.ownerHandle}/${goal.slug}`}
        className="group grid gap-4 py-7 transition sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-5 sm:py-8 lg:grid-cols-[8rem_3rem_minmax(0,1fr)_8rem_9rem_2rem] lg:items-center"
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
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {displayName(goal.ownerName)} · shared {relativeTime(goal.createdAt)}
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
          </div>
          <span className="hidden text-right text-xl transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)] lg:block" aria-hidden>→</span>
        </div>
      </Link>
    </motion.article>
  );
}

function CategoryFilter({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
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

function formatCategory(category?: string) {
  if (!category) return "Personal goal";
  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Auto-rotating carousel of hero illustration images.
 * Fades between slides every 5 seconds, with dot navigation.
 */
function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative aspect-square overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_SLIDES[index].src}
            alt={HERO_SLIDES[index].alt}
            className="h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-[var(--color-primary)]"
                : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
