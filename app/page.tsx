"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FEATURED_CATEGORIES } from "@/lib/categories";
import { relativeTime, displayName } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Header } from "@/components/Header";

const easeOut = [0.16, 1, 0.3, 1] as const;

const HERO_SLIDES = [
  { src: "/illustrations/hero-community-v3.webp", alt: "People supporting each other's goals" },
  { src: "/illustrations/motivation-circle-v3.webp", alt: "A group planning together" },
  { src: "/illustrations/steps/together-v3.webp", alt: "People working together" },
  { src: "/illustrations/steps/share-v3.webp", alt: "Friends encouraging each other" },
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
        <section className="px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20 lg:pb-32 lg:pt-24">
          <div className="shell-bleed grid items-center gap-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            <div className="lg:pr-5">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: easeOut }}
                className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-dark)]"
              >
                A public home for goals worth finishing
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.05, ease: easeOut }}
                className="mt-7 max-w-[11ch] text-balance font-display text-[clamp(3.35rem,6.25vw,6.35rem)] font-semibold leading-[0.91] tracking-[-0.058em]"
              >
                Big goals feel lighter with people beside you.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: easeOut }}
                className="mt-7 max-w-[36rem] text-pretty text-lg leading-8 text-[var(--color-text-secondary)]"
              >
                Make a page for what you&apos;re trying to do. Share honest progress, ask for the support you need, and let your people help you keep going.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: easeOut }}
                className="mt-9 flex flex-wrap items-center gap-5"
              >
                <Link
                  href={startGoalHref}
                  className="inline-flex min-h-13 items-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] active:translate-y-0"
                >
                  Start your goal <span className="ml-3" aria-hidden>→</span>
                </Link>
                <a
                  href="#explore"
                  className="inline-flex min-h-12 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  See what people are doing
                </a>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="mt-8 max-w-md text-sm leading-6 text-[var(--color-text-muted)]"
              >
                No fundraising. No follower count. Just a goal, the real work, and people who care.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: easeOut }}
              className="relative"
            >
              <HeroCommunityCollage cards={HERO_SLIDES} />
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 px-5 py-20 sm:px-8 sm:py-28">
          <div className="shell-content overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)] px-6 py-9 sm:px-10 sm:py-12 lg:grid lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-14 lg:py-16">
            <div className="lg:pt-2">
              <p className="text-sm font-semibold text-[var(--color-primary)]">How it works</p>
              <h2 className="mt-4 max-w-[12ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                Put the goal where your people can find it.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-[var(--color-text-secondary)]">
                Your page holds the plan, the imperfect updates, and the kind of help that would actually make a difference.
              </p>
              <p className="mt-9 max-w-sm rounded-[1.25rem] bg-[var(--color-surface)] p-5 text-lg font-medium leading-7 text-[var(--color-text)] shadow-[0_18px_45px_-35px_rgba(55,47,35,0.45)]">
                “It&apos;s easier to return to a goal when someone remembers why you started.”
              </p>
            </div>

            <ol className="mt-12 border-t border-[var(--color-border-strong)] lg:mt-0">
              {[
                ["1", "Say what you want to do", "Name the target, why it matters, and the next few steps. Clear beats impressive."],
                ["2", "Invite the right kind of help", "Ask for encouragement, advice, check-ins, or someone to work alongside you."],
                ["3", "Share the honest version", "Post the good weeks and the stuck ones. People can support what they can see."],
              ].map(([number, title, body]) => (
                <li key={number} className="grid gap-4 border-b border-[var(--color-border-strong)] py-7 sm:grid-cols-[3rem_1fr] sm:gap-5 sm:py-8">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">{number}</span>
                  <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr] md:gap-8">
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
            <div>
              <div className="max-w-4xl">
                <p className="text-sm font-semibold text-[var(--color-primary)]">Goals people have opened up</p>
                <h2 className="mt-4 max-w-[20ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                  Find someone worth showing up for.
                </h2>
              </div>
              <label className="mt-8 block max-w-2xl rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_16px_40px_-34px_rgba(55,47,35,0.45)] sm:px-5">
                <span className="block text-xs font-semibold text-[var(--color-text-muted)]">Search public goals</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Type a goal, person, or topic"
                  className="mt-1 w-full bg-transparent text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)]"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
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
              <div className="mt-6 grid gap-5 md:grid-cols-2" aria-label="Loading public goals">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="animate-pulse overflow-hidden rounded-[1.5rem] bg-[var(--color-surface)]">
                    <div className="aspect-[16/9] bg-[var(--color-bg-sunken)]" />
                    <div className="space-y-3 p-5"><div className="h-6 max-w-sm rounded-full bg-[var(--color-bg-sunken)]" /><div className="h-3 max-w-xs rounded-full bg-[var(--color-bg-sunken)]" /></div>
                  </div>
                ))}
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] bg-[var(--color-bg-elev)] px-6 py-14">
                <p className="max-w-lg text-xl font-medium">No public goals match that search.</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Try a broader term, or put the first goal in this category on the board.</p>
                <Link href={startGoalHref} className="mt-7 inline-block border-b border-[var(--color-primary)] pb-1 text-sm font-semibold text-[var(--color-primary)]">Start a goal →</Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {filteredGoals.map((goal: any, index) => (
                  <GoalTile
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
              className="mt-9 inline-flex min-h-11 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Browse all public goals <span className="ml-3" aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="px-5 pb-20 pt-4 sm:px-8 sm:pb-28">
          <div className="shell-content grid gap-10 overflow-hidden rounded-[2rem] bg-[var(--color-primary-soft)] px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary-dark)]">Ready when it matters to you</p>
              <h2 className="mt-4 max-w-[15ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                You don&apos;t have to carry the whole goal alone.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
                Give it a home, invite a few people in, and make the next step easier to take.
              </p>
            </div>
            <Link
              href={startGoalHref}
              className="inline-flex min-h-13 w-fit items-center rounded-full bg-[var(--color-text)] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] active:translate-y-0"
            >
              Start your goal <span className="ml-4" aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function GoalTile({
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
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.2), ease: easeOut }}
      className="h-full"
    >
      <Link
        href={`/o/${goal.ownerHandle}/${goal.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border)] hover:shadow-[0_26px_60px_-42px_rgba(55,47,35,0.5)] active:translate-y-0"
      >
        {goal.coverImageId ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-bg-sunken)]">
            {coverUrl === undefined ? (
              <div className="h-full w-full animate-pulse bg-[var(--color-bg-sunken)]" />
            ) : coverUrl ? (
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              />
            ) : (
              <div className="h-full w-full bg-[var(--color-bg-sunken)]" aria-hidden />
            )}
          </div>
        ) : (
          <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-bg-elev)]">
            <Image
              src={HERO_SLIDES[index % HERO_SLIDES.length].src}
              alt=""
              fill
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--color-text-muted)]">
            <span>{formatCategory(goal.category)}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="mt-auto pt-8">
            <h3 className="text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] transition group-hover:text-[var(--color-primary)] sm:text-3xl">
              {goal.title}
            </h3>
            {goal.summary ? (
              <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">
                {goal.summary}
              </p>
            ) : null}
            <p className="mt-5 text-sm text-[var(--color-text-muted)]">
              By <span className="font-semibold text-[var(--color-text)]">{displayName(goal.ownerName)}</span> · {relativeTime(goal.createdAt)}
            </p>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
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
      className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--color-text)] text-white"
          : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-dark)]"
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

function HeroCommunityCollage({
  cards,
}: {
  cards: Array<{ src: string; alt: string }>;
}) {
  const placements = [
    "left-[2%] top-[1%] w-[51%] -rotate-[4deg]",
    "right-[1%] top-[12%] w-[43%] rotate-[4deg]",
    "bottom-[1%] left-[9%] w-[39%] rotate-[3deg]",
    "bottom-[3%] right-[4%] w-[45%] -rotate-[3deg]",
  ];

  return (
    <div className="relative mx-auto aspect-[1/1.02] w-full max-w-[43rem] sm:aspect-[1.08/1]">
      <div className="absolute inset-[7%] rotate-2 rounded-[30%_45%_34%_48%] bg-[var(--color-primary-soft)]" aria-hidden />
      {cards.map((card, index) => (
        <motion.figure
          key={`${card.src}-${index}`}
          initial={{ opacity: 0, y: 22, rotate: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 + index * 0.08, ease: easeOut }}
          className={`absolute overflow-hidden rounded-[1.35rem] border-[5px] border-[var(--color-surface)] bg-[var(--color-surface)] shadow-[0_28px_70px_-38px_rgba(43,39,31,0.58)] ${placements[index]}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[0.95rem] bg-[var(--color-bg-sunken)]">
            <Image
              src={card.src}
              alt={card.alt}
              fill
              priority={index < 2}
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 36vw, 48vw"
              className="object-cover"
            />
          </div>
        </motion.figure>
      ))}
    </div>
  );
}
