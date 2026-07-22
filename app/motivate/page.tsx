"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Heart,
  Lightbulb,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";

const ROLE_META: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-rose-500" },
  accountability: { label: "Accountability", icon: Calendar, color: "text-emerald-600" },
  advice: { label: "Advice", icon: Lightbulb, color: "text-amber-600" },
  review: { label: "Review", icon: Target, color: "text-sky-600" },
  challenge: { label: "Challenge", icon: Users, color: "text-violet-600" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After each update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

const ROW_MEDIA = [
  "/illustrations/steps/together-v3.webp",
  "/illustrations/steps/share-v3.webp",
  "/illustrations/steps/move-v3.webp",
  "/illustrations/steps/plan-v3.webp",
];

export default function MotivatePage() {
  return (
    <RequireAuth>
      <MotivateContent />
    </RequireAuth>
  );
}

function MotivateContent() {
  const pledges = useQuery(api.motivation.listMyMotivations, { includeStatuses: ["active", "paused"] });
  const goals = useQuery(api.goals.listMine);
  const goalTitleById = new Map<string, string>();
  if (goals) for (const goal of goals) goalTitleById.set(goal._id, goal.title);

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto grid max-w-[90rem] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <section className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="brand-kicker">Your commitments</p>
            <h1 className="mt-3 max-w-3xl font-display text-balance text-5xl font-bold leading-[0.92] tracking-[-0.06em] sm:text-7xl">
              Goals you’re showing up for.
            </h1>
            <Link href="/explore" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3">
              Explore more goals <ArrowRight size={16} />
            </Link>
          </motion.div>

          {pledges === undefined ? (
            <div className="mt-10 divide-y divide-[#deddd6] border-y border-[#deddd6]">
              {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse bg-[#f3f2ed]" />)}
            </div>
          ) : pledges.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-10 divide-y divide-[#deddd6] border-y border-[#deddd6]">
              {pledges.map((pledge, index) => {
                const meta = ROLE_META[pledge.role] ?? ROLE_META.encourager;
                const Icon = meta.icon;
                return (
                  <Link
                    key={pledge._id}
                    href={`/o/${pledge.goalId}`}
                    className="group grid gap-4 py-5 transition sm:grid-cols-[11rem_minmax(0,1fr)_9rem_1.4rem] sm:items-center sm:gap-7"
                  >
                    <div className="aspect-[1.7/1] overflow-hidden rounded-xl bg-[#e8edf9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ROW_MEDIA[index % ROW_MEDIA.length]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-2xl font-bold tracking-[-0.04em]">{goalTitleById.get(pledge.goalId) ?? "A goal in your circle"}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#686963]">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.color}`}><Icon size={15} /> {meta.label}</span>
                        <span className="h-4 w-px bg-[#deddd6]" />
                        <span>{FREQ_LABEL[pledge.checkInFrequency] ?? pledge.checkInFrequency}</span>
                      </div>
                      {pledge.pledgeText && <p className="mt-2 line-clamp-1 text-sm italic text-[#777872]">“{pledge.pledgeText}”</p>}
                    </div>
                    <div className="text-sm text-[#686963] sm:text-right">{pledge.isCoreMotivator ? "Core circle" : "Community circle"}</div>
                    <ArrowRight size={20} className="hidden text-[#555650] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)] sm:block" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="border-t border-[#deddd6] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[#fdf1ca] text-[#bf8500]">
            <Sparkles size={25} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-[-0.045em]">Keep it simple</h2>
          <p className="mt-4 text-base leading-7 text-[#686963]">
            Small, consistent check-ins make a big difference. A few words of encouragement can keep someone moving forward.
          </p>
        </aside>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 grid place-items-center border-y border-dashed border-[#c9c8c0] px-6 py-16 text-center">
      <Sparkles size={28} className="text-[#c68d00]" />
      <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.035em]">No commitments yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#686963]">When someone invites you into their circle, their goal will appear here.</p>
      <Link href="/explore" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]">
        Browse goals <ArrowRight size={15} />
      </Link>
    </div>
  );
}
