"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FEATURED_CATEGORIES } from "@/lib/categories";
import { relativeTime, displayName } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { JOURNEY_ILLUSTRATIONS, journeyIllustrationForProgress } from "@/lib/journeyIllustrations";
import { Header } from "@/components/Header";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function HomePage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const recent = useQuery(api.public.listRecentPublic, { limit: 12 });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
                className="inline-flex border-l-2 border-[var(--color-sun)] py-1 pl-3 text-xs font-semibold text-[var(--color-primary-dark)]"
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
                  data-fast-goal="start_goal_clicked"
                  data-fast-goal-source="home_hero"
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
              <JourneyHero />
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
                Your page holds the plan, the imperfect updates, and the specific help you asked for.
              </p>
              <p className="mt-9 max-w-sm rounded-[1.25rem] bg-[var(--color-surface)] p-5 text-lg font-medium leading-7 text-[var(--color-text)] shadow-[0_18px_45px_-35px_rgba(55,47,35,0.45)]">
                “It&apos;s easier to return to a goal when someone remembers why you started.”
              </p>
              <div className="mt-6 flex max-w-sm flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-strong)] pt-5">
                <p className="max-w-[19rem] text-sm leading-6 text-[var(--color-text-muted)]">
                  Questions about privacy, supporters, or what happens after you start?
                </p>
                <Link
                  href="/faq"
                  data-fast-goal="faq_clicked"
                  data-fast-goal-source="home_how_it_works"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-primary)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:translate-y-0"
                >
                  Read the FAQs <span className="ml-3" aria-hidden>→</span>
                </Link>
              </div>
            </div>

            <ol className="mt-12 border-t border-[var(--color-border-strong)] lg:mt-0">
              {[
                ["1", "Say what you want to do", "Name the target, why it matters, and the next few steps. Clear beats impressive.", JOURNEY_ILLUSTRATIONS.begin],
                ["2", "Invite the right kind of help", "Ask for encouragement, advice, check-ins, or someone to work alongside you.", JOURNEY_ILLUSTRATIONS.support],
                ["3", "Share the honest version", "Post the good weeks and the stuck ones. People can support what they can see.", JOURNEY_ILLUSTRATIONS.move],
              ].map(([number, title, body, illustration]) => (
                <li key={number as string} className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] gap-4 border-b border-[var(--color-border-strong)] py-7 sm:grid-cols-[3rem_minmax(0,1fr)_6.5rem] sm:gap-5 sm:py-8">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">{number as string}</span>
                  <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr] md:gap-8">
                    <h3 className="text-xl font-semibold tracking-[-0.025em]">{title as string}</h3>
                    <p className="max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">{body as string}</p>
                  </div>
                  <div className="relative aspect-square self-center overflow-hidden rounded-[1rem] bg-[var(--color-surface)]">
                    <Image src={(illustration as typeof JOURNEY_ILLUSTRATIONS.begin).src} alt="" fill sizes="104px" className="object-cover mix-blend-multiply" />
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
                  />
                ))}
              </div>
            )}

            <Link
              href="/explore"
              data-fast-goal="explore_goals_clicked"
              data-fast-goal-source="home"
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
              data-fast-goal="start_goal_clicked"
              data-fast-goal-source="home_footer_cta"
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
}: {
  goal: any;
  index: number;
}) {
  const goalId = goal._id as Id<"goals">;
  const publicDetail = useQuery(
    api.public.getGoalByHandleAndSlug,
    goal.ownerHandle ? { handle: goal.ownerHandle, slug: goal.slug } : "skip"
  );
  const reactionStats = useQuery(api.reactions.publicStats, { goalId });
  const supporterRows = useQuery(api.supporters.listForGoal, { goalId, limit: 3 });
  const supporterIds = useMemo(
    () => (supporterRows ?? []).map((supporter) => supporter.userId),
    [supporterRows]
  );
  const supporterProfiles = useQuery(
    api.users.profilesById,
    supporterIds.length > 0 ? { ids: supporterIds } : "skip"
  );
  const progress = Math.max(0, Math.min(100, Number(goal.progress ?? 0)));
  const ownerName = displayName(goal.ownerName ?? "Anonymous");
  const supporters = (supporterRows ?? [])
    .map((supporter) => {
      const profile = supporterProfiles?.[supporter.userId];
      if (!profile) return null;
      return {
        name: profile.name ?? profile.handle ?? "Supporter",
        image: profile.image ?? undefined,
      };
    })
    .filter(Boolean) as Array<{ name: string; image?: string }>;
  const supporterCount = Number(goal.supporterCount ?? 0);
  const reactionTotal = Number(reactionStats?.emojiTotal ?? 0);
  const reactionGlyphs = activeReactionGlyphs(reactionStats?.emojiCounts);
  const enrichedGoal = { ...goal, milestones: publicDetail?.milestones };
  const checkpoint = goalCheckpoint(enrichedGoal, progress);
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
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-bg-elev)]">
          <Image
            src={journeyIllustrationForProgress(progress).src}
            alt=""
            fill
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--color-text-muted)]">
            <span>{formatCategory(goal.category)}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="pt-6">
            <h3 className="text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] transition group-hover:text-[var(--color-primary)] sm:text-3xl">
              {goal.title}
            </h3>
            {goal.summary ? (
              <p className="mt-3 line-clamp-2 min-h-12 max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">
                {goal.summary}
              </p>
            ) : (
              <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--color-text-muted)]">
                Follow the progress and help this goal keep moving.
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <GoalAvatar name={ownerName} image={goal.ownerImage} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">{ownerName}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Started {relativeTime(goal.createdAt)}</p>
              </div>
            </div>
            <SupporterAvatarStack supporters={supporters} total={supporterCount} />
          </div>

          <dl className="mt-4 grid grid-cols-[1.35fr_0.8fr_0.9fr] divide-x divide-[var(--color-border)] border-y border-[var(--color-border)] py-3">
            <GoalMetric label="Progress" value={formatGoalMetric(enrichedGoal)} />
            <GoalMetric
              label="Supporters"
              value={goal.supporterTarget ? `${supporterCount}/${goal.supporterTarget}` : String(supporterCount)}
            />
            <div className="min-w-0 pl-3 sm:pl-4">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Reactions</dt>
              <dd className="mt-1 flex min-w-0 items-center gap-1 text-sm font-semibold tabular-nums text-[var(--color-text)]">
                {reactionGlyphs.length > 0 ? (
                  <span className="truncate tracking-[-0.08em]" aria-hidden>{reactionGlyphs.join("")}</span>
                ) : null}
                <span>{reactionTotal}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Flag size={14} strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{checkpoint.kicker}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{checkpoint.label}</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">{checkpoint.meta}</span>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function GoalAvatar({
  name,
  image,
  small = false,
}: {
  name: string;
  image?: string | null;
  small?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const size = small ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={`${name}'s avatar`} className={`${size} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`} />;
  }

  return (
    <span
      aria-label={`${name}'s avatar`}
      className={`${size} grid shrink-0 place-items-center rounded-full border-2 border-white bg-[var(--color-primary)] font-bold text-white shadow-sm`}
    >
      {initials}
    </span>
  );
}

function SupporterAvatarStack({
  supporters,
  total,
}: {
  supporters: Array<{ name: string; image?: string }>;
  total: number;
}) {
  if (total === 0) {
    return <span className="shrink-0 text-xs font-medium text-[var(--color-primary)]">Open for support</span>;
  }

  const remaining = Math.max(0, total - supporters.length);
  return (
    <div className="flex shrink-0 items-center" aria-label={`${total} ${total === 1 ? "supporter" : "supporters"}`}>
      {supporters.map((supporter, index) => (
        <span key={`${supporter.name}-${index}`} className={index === 0 ? "" : "-ml-2"}>
          <GoalAvatar name={supporter.name} image={supporter.image} small />
        </span>
      ))}
      {remaining > 0 ? (
        <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full border-2 border-white bg-[var(--color-bg-sunken)] px-1.5 text-[10px] font-bold text-[var(--color-text-muted)] shadow-sm">
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}

function GoalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 sm:px-4 sm:first:pl-0">
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function formatGoalMetric(goal: any) {
  const current = Number(goal.currentValue ?? goal.startValue ?? 0);
  const target = Number(goal.targetValue ?? 0);
  const unit = String(goal.unit ?? "").trim();
  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

  if (goal.progressType === "milestones") {
    const milestones = (goal.milestones ?? []) as Array<{ done: boolean }>;
    return `${milestones.filter((milestone) => milestone.done).length}/${milestones.length} milestones`;
  }

  return `${number.format(current)}/${number.format(target)}${unit ? ` ${unit}` : ""}`;
}

function goalCheckpoint(goal: any, progress: number) {
  const milestones = (goal.milestones ?? []) as Array<{ title: string; done: boolean }>;
  if (milestones.length > 0) {
    const completed = milestones.filter((milestone) => milestone.done).length;
    const next = milestones.find((milestone) => !milestone.done);
    return next
      ? { kicker: "Next milestone", label: next.title, meta: `${completed}/${milestones.length} done` }
      : { kicker: "Milestones", label: "Every milestone reached", meta: `${completed}/${milestones.length} done` };
  }

  if (progress >= 100) {
    return { kicker: "Checkpoint", label: "Goal complete", meta: "100% reached" };
  }

  const nextCheckpoint = [25, 50, 75, 100].find((value) => value > progress) ?? 100;
  return {
    kicker: "Next checkpoint",
    label: `${nextCheckpoint}% of the goal`,
    meta: `${Math.round(progress)}% now`,
  };
}

function activeReactionGlyphs(counts?: Record<string, number>) {
  const glyphs: Record<string, string> = {
    thumbsup: "👍",
    muscle: "💪",
    heart: "♥",
    fire: "🔥",
  };
  return Object.entries(counts ?? {})
    .filter(([, count]) => Number(count) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([key]) => glyphs[key] ?? "");
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

function JourneyHero() {
  return (
    <figure className="relative mx-auto aspect-square w-full max-w-[43rem] overflow-hidden">
      <Image
        src={JOURNEY_ILLUSTRATIONS.homeCommunity.src}
        alt={JOURNEY_ILLUSTRATIONS.homeCommunity.alt}
        fill
        priority
        sizes="(min-width: 1024px) 52vw, 100vw"
        className="object-contain mix-blend-multiply"
      />
      <figcaption className="absolute bottom-[3%] left-[4%] max-w-[15rem] border-l-2 border-[var(--color-sun)] bg-[color:rgba(251,250,246,0.88)] py-2 pl-3 pr-4 text-xs font-medium leading-5 text-[var(--color-text-secondary)] backdrop-blur-sm">
        Every goal here is public, and has people behind it.
      </figcaption>
    </figure>
  );
}
