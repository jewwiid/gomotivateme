"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CategoryIcon } from "@/components/CategoryIcon";
import { FEATURED_CATEGORIES } from "@/lib/categories";
import { formatNumber, relativeTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { WelcomeModal } from "@/components/WelcomeModal";

const FALLBACK_GOAL_MEDIA = [
  "/illustrations/hero-community-v3.webp",
  "/illustrations/steps/plan-v3.webp",
  "/illustrations/steps/share-v3.webp",
  "/illustrations/steps/move-v3.webp",
  "/illustrations/steps/together-v3.webp",
];

const HERO_MEDIA = [
  { src: "/illustrations/steps/move-v3.webp", alt: "A member getting ready to take the next step toward a goal", tilt: "-rotate-[7deg]" },
  { src: "/illustrations/steps/plan-v3.webp", alt: "A member planning a personal goal", tilt: "-rotate-[3deg]" },
  { src: "/illustrations/hero-community-v3.webp", alt: "Friends supporting one another toward their goals", tilt: "rotate-0" },
  { src: "/illustrations/steps/share-v3.webp", alt: "Friends sharing a progress update", tilt: "rotate-[3deg]" },
  { src: "/illustrations/steps/together-v3.webp", alt: "A support team working toward a shared goal", tilt: "rotate-[7deg]" },
];

export default function HomePage() {
  const { user } = useCurrentUser();
  const recent = useQuery(api.public.listRecentPublic, { limit: 12 });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const coverIds = useMemo(
    () =>
      Array.from(
        new Set((recent ?? []).map((goal: any) => goal.coverImageId).filter(Boolean))
      ),
    [recent]
  );
  const coverUrls = useQuery(
    api.storage.getUrls,
    coverIds.length > 0 ? { ids: coverIds as any } : "skip"
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
    return goals.slice(0, 5);
  }, [activeCategory, recent, searchQuery]);

  const startGoalHref = user ? "/dashboard/new" : "/signup";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffdf8] text-[#242424]">
      {!user && <WelcomeModal />}

      <Header />

      <main>
        <section className="relative px-5 pb-6 pt-20 sm:px-8 sm:pt-28 lg:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6e981b]"
            >
              <span className="h-2 w-2 rounded-full bg-[#b9e85f]" />
              Goals grow with support
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.07 }}
              className="mx-auto mt-5 max-w-5xl text-balance font-display text-[clamp(3rem,7.25vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.06em] text-[#242424]"
            >
              Every goal goes further
              <br className="hidden sm:block" />
              with people behind it.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-[#666762] sm:text-lg"
            >
              Share your progress. Let the people who care help you keep going.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.21 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href={startGoalHref} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_20px_rgba(4,77,252,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)]">
                Start a goal <ArrowRight size={17} />
              </Link>
              <a href="#explore" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3">
                Explore goals <ArrowRight size={16} />
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
            className="mx-auto mt-16 grid max-w-[88rem] grid-cols-3 items-end gap-3 sm:mt-20 sm:grid-cols-5 sm:gap-5"
          >
            {HERO_MEDIA.map((media, index) => (
              <div
                key={media.src}
                className={`${media.tilt} ${index > 2 ? "hidden sm:block" : ""} relative overflow-hidden rounded-[1.35rem] bg-[#edece6] shadow-[0_14px_30px_rgba(31,31,27,0.08)] ${index === 2 ? "aspect-[1.05/1] sm:-translate-y-5" : "aspect-[.84/1]"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.src} alt={media.alt} className="h-full w-full object-cover" />
              </div>
            ))}
          </motion.div>
        </section>

        <section id="how-it-works" className="relative mt-12 overflow-hidden bg-[#f1f3ed] px-5 py-20 sm:mt-16 sm:px-8 sm:py-28">
          <div className="pointer-events-none absolute inset-x-[-8%] -top-14 h-24 rounded-[50%] bg-[#fffdf8]" />
          <div className="relative mx-auto grid max-w-[80rem] items-center gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
            <div className="relative mx-auto w-full max-w-xl rounded-[2rem] bg-[#dff2ae] p-7 sm:p-10">
              <div className="absolute left-8 top-8 h-8 w-8 rounded-full border-[5px] border-[#f7fbeb]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/steps/share-v3.webp" alt="Friends sharing a progress update with supporters" className="mx-auto w-full max-w-md object-contain" />
              <div className="absolute bottom-7 left-7 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#333] shadow-sm sm:bottom-10 sm:left-10">You&apos;ve got this.</div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e981b]">How it works</p>
              <h2 className="mt-4 max-w-xl text-balance font-display text-4xl font-bold leading-[0.98] tracking-[-0.05em] text-[#252525] sm:text-6xl">Support makes progress stick.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#646560] sm:text-lg">GoMotivateMe helps you turn a meaningful goal into lasting change—with encouragement from people who want to see you win.</p>
              <ol className="mt-9 divide-y divide-[#d3d5ce] border-y border-[#d3d5ce]">
                {[
                  ["01", "Set a goal", "Choose something meaningful, then decide what progress looks like."],
                  ["02", "Invite your people", "Share one link with the people you want beside you."],
                  ["03", "Keep showing up", "Post the small wins, the stuck moments, and what comes next."],
                ].map(([number, title, body]) => (
                  <li key={number} className="grid grid-cols-[3.5rem_1fr] gap-3 py-5 sm:grid-cols-[5rem_1fr] sm:py-6">
                    <span className="pt-0.5 text-2xl font-bold tracking-[-0.05em] text-[var(--color-primary)]">{number}</span>
                    <div><h3 className="text-lg font-bold tracking-[-0.03em] text-[#292929]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#686963]">{body}</p></div>
                  </li>
                ))}
              </ol>
              <a href="#explore" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3">See how GoMotivateMe works <ArrowRight size={16} /></a>
            </div>
          </div>
        </section>

        <section id="explore" className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[80rem]">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e981b]">Find a goal to stand behind</p>
                <h2 className="mt-4 text-balance font-display text-4xl font-bold leading-[0.96] tracking-[-0.055em] text-[#252525] sm:text-6xl">Small steps. Real people.</h2>
              </div>
              <label className="relative block w-full max-w-sm">
                <span className="sr-only">Search goals</span>
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71736d]" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search goals" className="w-full rounded-xl border border-[#bdbeb7] bg-transparent py-3 pl-11 pr-4 text-sm text-[#252525] placeholder:text-[#72736e] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
              </label>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <CategoryFilter active={activeCategory === null} label="All goals" onClick={() => setActiveCategory(null)} />
              {FEATURED_CATEGORIES.map((category) => <CategoryFilter key={category.id} active={activeCategory === category.id} label={category.label} icon={<CategoryIcon category={category.id} size={14} />} onClick={() => setActiveCategory(category.id)} />)}
            </div>

            {filteredGoals.length === 0 ? (
              <div className="mt-12 grid place-items-center border-y border-[#e4e3dc] py-16 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/empty-new-beginning-v3.webp" alt="A seedling ready to grow" className="h-28 w-28 object-contain" />
                <p className="mt-4 max-w-sm text-base text-[#666762]">{recent === undefined ? "Finding goals worth cheering for…" : "No goals match that search yet. Be the first to share yours."}</p>
                <Link href={startGoalHref} className="mt-5 text-sm font-bold text-[var(--color-primary)]">Start a goal <span aria-hidden>→</span></Link>
              </div>
            ) : (
              <div className="mt-10 grid gap-x-5 gap-y-9 md:grid-cols-2 lg:grid-cols-4">
                {filteredGoals.map((goal: any, index) => (
                  <GoalTile key={goal._id} goal={goal} image={goal.coverImageId ? coverUrls?.[goal.coverImageId] ?? FALLBACK_GOAL_MEDIA[index] : FALLBACK_GOAL_MEDIA[index]} featured={index === 0} />
                ))}
              </div>
            )}
            <div className="mt-11"><Link href="/explore" className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white">Explore all goals <ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#ffe28a] px-5 py-24 text-center sm:px-8 sm:py-32">
          <div className="pointer-events-none absolute inset-x-[-10%] -top-12 h-20 rounded-[50%] bg-[#fffdf8]" />
          <div className="pointer-events-none absolute inset-x-[-10%] -bottom-12 h-20 rounded-[50%] bg-[#fffdf8]" />
          <div className="relative mx-auto max-w-4xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#63572d]"><Heart size={17} className="text-[#b48900]" fill="currentColor" /> A little support changes the whole journey</p>
            <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-[0.96] tracking-[-0.055em] text-[#2b2a24] sm:text-6xl">Your next step deserves a team.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5f583d] sm:text-lg">Share your goal, rally your people, and move forward with confidence.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"><Link href={startGoalHref} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[var(--color-primary-dark)]">Start a goal <ArrowRight size={17} /></Link><a href="#explore" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3">Explore goals <ArrowRight size={16} /></a></div>
          </div>
        </section>
      </main>

      <footer className="bg-[#fffdf8] px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto grid max-w-[80rem] gap-12 border-b border-[#e3e1d8] pb-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div><Logo href="/" height={30} /><p className="mt-4 max-w-xs text-sm leading-6 text-[#676862]">Real goals. Real people. Together.</p></div>
          <FooterColumn title="Explore" links={[["Explore goals", "/explore"], ["How it works", "#how-it-works"], ["Goal ideas", "/dashboard/new"]]} />
          <FooterColumn title="Start a goal" links={[["Create a goal", startGoalHref], ["Build your team", "#how-it-works"], ["Share progress", startGoalHref]]} />
          <FooterColumn title="About" links={[["Our approach", "#how-it-works"], ["Community standards", "#explore"], ["Contact", "mailto:hello@gomotivateme.com"]]} />
        </div>
        <div className="mx-auto flex max-w-[80rem] flex-col gap-4 py-7 text-xs text-[#74756f] sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} GoMotivateMe</p><div className="flex flex-wrap gap-x-5 gap-y-2"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Community guidelines</a></div></div>
      </footer>
    </div>
  );
}

function GoalTile({ goal, image, featured }: { goal: any; image: string; featured: boolean }) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress ?? 0)));
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4 }} className={featured ? "md:col-span-2 lg:row-span-2 lg:col-span-2" : ""}>
      <Link href={`/o/${goal.slug}`} className="group block">
        <div className={`overflow-hidden rounded-[1rem] bg-[#edede8] ${featured ? "aspect-[1.32/1]" : "aspect-[1.45/1]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`${goal.title} goal by ${goal.ownerName || "a GoMotivateMe member"}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        </div>
        <div className="px-1 pt-3"><div className="flex items-start justify-between gap-3"><h3 className={`${featured ? "text-xl sm:text-2xl" : "text-base"} font-bold leading-tight tracking-[-0.035em] text-[#2a2a2a]`}>{goal.title}</h3><span className="shrink-0 text-[11px] font-medium text-[#777872]"><CategoryIcon category={goal.category} size={15} /></span></div><p className="mt-1 text-sm text-[#73746e]">by {goal.ownerName || "Someone"} · {relativeTime(goal.createdAt)}</p><div className="mt-4 flex items-center gap-3"><div className="h-1 flex-1 overflow-hidden rounded-full bg-[#e1e1dc]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} /></div><span className="whitespace-nowrap text-xs font-semibold text-[#656660]">{Math.round(progress)}% complete</span></div>{featured && <p className="mt-3 text-sm text-[#70716a]">{goal.supporterCount ? `${formatNumber(goal.supporterCount)} people cheering them on` : "Be one of the first people behind this goal"}</p>}</div>
      </Link>
    </motion.article>
  );
}

function CategoryFilter({ active, label, icon, onClick }: { active: boolean; label: string; icon?: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${active ? "border-[#292929] bg-[#292929] text-white" : "border-[#cfcfc8] bg-transparent text-[#4c4d48] hover:border-[#777872]"}`}>{icon}{label}</button>;
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return <div><h2 className="text-sm font-bold text-[#33332f]">{title}</h2><ul className="mt-4 space-y-2.5 text-sm text-[#656660]">{links.map(([label, href]) => <li key={label}><Link href={href} className="transition hover:text-[var(--color-primary)]">{label}</Link></li>)}</ul></div>;
}
