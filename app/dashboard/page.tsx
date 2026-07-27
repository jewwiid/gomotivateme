"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardWorkspaceShell } from "@/components/DashboardWorkspaceShell";
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
    <DashboardWorkspaceShell active="goals">
      <main className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="brand-kicker">My goals</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="title-page">
                  Your goals, your pace.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
                  See what's next and let your people know how to help.
                </p>
              </div>
              <Link
                href="/dashboard/new"
                className="workspace-button-primary w-auto px-5"
              >
                Start a goal <Plus size={16} />
              </Link>
            </div>
          </motion.div>

          <dl className="workspace-card mt-7 grid divide-y divide-[var(--color-border)] overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <DashboardStat value={goals?.length ?? 0} label="total goals" loading={goals === undefined} />
            <DashboardStat value={activeGoals} label="active" loading={goals === undefined} />
            <DashboardStat value={supporters} label="supporters" loading={goals === undefined} />
          </dl>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="brand-kicker">Your goals</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">All goals</h2>
              </div>
              {goals && goals.length > 3 && (
                <span className="text-sm text-[var(--color-text-muted)]">{goals.length} in total</span>
              )}
            </div>

            {goals === undefined ? (
              <div className="workspace-card mt-5 divide-y divide-[var(--color-border)] overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-36 animate-pulse bg-[var(--color-bg-elev)]" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="workspace-card mt-5 divide-y divide-[var(--color-border)] overflow-hidden px-4">
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

        <aside className="space-y-4">
          <section className="workspace-card p-5">
            <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-[-0.035em]">Your circle</h2>
            <Users size={18} className="text-[var(--color-primary)]" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              The people you show up for, and the people showing up for you.
            </p>
            <Link
              href="/motivate"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
            >
              See your commitments <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard/supporting"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
            >
              Goals you're supporting <ArrowRight size={15} />
            </Link>
          </section>

          <section className="workspace-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--color-gold-text)]" />
              <h2 className="font-display text-xl font-bold tracking-[-0.035em]">Post an update</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
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
          </section>
        </aside>
      </main>
    </DashboardWorkspaceShell>
  );
}

function DashboardStat({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <div className="px-5 py-5 sm:px-6">
      <dt className="text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 font-display text-4xl font-bold tracking-[-0.05em] tabular-nums">
        {loading ? "—" : value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="workspace-card mt-5 grid place-items-center px-6 py-14 text-center">
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
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
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
