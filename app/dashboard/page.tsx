"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { GoalCard } from "@/components/GoalCard";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useCurrentUser();
  const goals = useQuery(api.goals.listMine);
  const activeGoals = goals?.filter((goal: any) => goal.status === "active").length ?? 0;
  const supporters = goals?.reduce((sum: number, goal: any) => sum + (goal.supporterCount ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />

      <main className="mx-auto grid max-w-[90rem] gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="brand-kicker">Dashboard</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="font-display text-balance text-5xl font-bold leading-[0.94] tracking-[-0.06em] sm:text-6xl">
                  Your goals, your pace.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-[#686963]">
                  See what's next and let your people know how to help.
                </p>
              </div>
              <Link
                href="/dashboard/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,77,252,0.16)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)]"
              >
                Start a goal <Plus size={16} />
              </Link>
            </div>
          </motion.div>

          <dl className="mt-12 grid divide-y divide-[#deddd6] border-y border-[#deddd6] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <DashboardStat value={goals?.length ?? 0} label="total goals" loading={goals === undefined} />
            <DashboardStat value={activeGoals} label="active" loading={goals === undefined} />
            <DashboardStat value={supporters} label="supporters" loading={goals === undefined} />
          </dl>

          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="brand-kicker">Your goals</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.045em]">All goals</h2>
              </div>
              {goals && goals.length > 3 && (
                <span className="text-sm text-[#777872]">{goals.length} in total</span>
              )}
            </div>

            {goals === undefined ? (
              <div className="mt-7 divide-y divide-[#deddd6] border-y border-[#deddd6]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-36 animate-pulse bg-[#f4f3ed]" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="mt-7 divide-y divide-[#deddd6] border-y border-[#deddd6]">
                {goals.map((goal: any, i: number) => (
                  <motion.div
                    key={goal._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
                  >
                    <GoalCard goal={goal} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="border-t border-[#deddd6] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-[-0.035em]">Your circle</h2>
            <Users size={18} className="text-[var(--color-primary)]" />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#686963]">
            The people you show up for, and the people showing up for you.
          </p>
          <Link
            href="/motivate"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
          >
            See your commitments <ArrowRight size={15} />
          </Link>

          <div className="mt-12 border-t border-[#deddd6] pt-8">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#c68d00]" />
              <h2 className="font-display text-xl font-bold tracking-[-0.035em]">Post an update</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#686963]">
              Even a quick update gives your supporters something to rally around.
            </p>
            {user?.handle && (
              <Link
                href={`/@${user.handle}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
              >
                View your profile <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function DashboardStat({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <div className="px-0 py-5 first:pt-5 sm:px-7 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-sm text-[#686963]">{label}</dt>
      <dd className="mt-1 font-display text-4xl font-bold tracking-[-0.05em] tabular-nums">
        {loading ? "—" : value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-7 grid place-items-center border-y border-[#deddd6] px-6 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/empty-new-beginning-v3.webp"
        alt=""
        aria-hidden
        width={200}
        height={150}
        className="mb-5 w-48 select-none object-contain"
      />
      <h3 className="font-display text-2xl font-bold tracking-[-0.035em]">Start where you are.</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#686963]">
        Pick something you want to achieve, decide what progress looks like, and invite the people you want beside you.
      </p>
      <Link
        href="/dashboard/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
      >
        Create your first goal <Plus size={15} />
      </Link>
    </div>
  );
}
