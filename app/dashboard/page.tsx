"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Flame, Plus, Sparkles, Trophy, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardWorkspaceShell } from "@/components/DashboardWorkspaceShell";
import { GoalCard } from "@/components/GoalCard";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useState } from "react";
import { AiAssistButton, AiDraftDisclosure } from "@/components/AiAssist";
import { aiAssistantErrorMessage } from "@/lib/aiAssistant";
import { trackDataFastGoal } from "@/lib/analytics";

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
  const weekly = useQuery(api.insights.weeklySummary, {
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  });
  const achievements = useQuery(api.achievements.listMine, {});
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

          <WeeklySummary summary={weekly} />

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
                    <GoalCard goal={goal} index={i} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="workspace-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="brand-kicker">Earned</p>
                <h2 className="mt-2 font-display text-xl font-bold tracking-[-0.035em]">Achievements</h2>
              </div>
              <Trophy size={19} className="text-[var(--color-gold-text)]" />
            </div>
            {achievements === undefined ? (
              <div className="mt-4 h-24 animate-pulse bg-[var(--color-bg-elev)]" />
            ) : achievements.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Your first daily check-in unlocks the first achievement.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[var(--color-border-subtle)]">
                {achievements.slice(0, 4).map((achievement: any) => (
                  <div key={achievement._id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
                      <Flame size={15} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{achievement.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                        {achievement.goalTitle} · {achievement.value} days
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

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
            <Link
              href="/settings?tab=notifications"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
            >
              Reminder settings <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </main>
    </DashboardWorkspaceShell>
  );
}

function WeeklySummary({ summary }: { summary: any }) {
  const createWeeklyRecap = useAction(api.aiCoach.createWeeklyRecap);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [reflection, setReflection] = useState<{
    narrative: string;
    reflectionQuestion: string;
    highlight: string;
  } | null>(null);

  const requestReflection = async () => {
    setAiBusy(true);
    setAiErr(null);
    try {
      const result = await createWeeklyRecap({
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      setReflection({
        narrative: result.narrative,
        reflectionQuestion: result.reflectionQuestion,
        highlight: result.highlight,
      });
      void recordAiOutcome({ usageEventId: result.usageEventId, outcome: "viewed" });
      trackDataFastGoal("ai_summary_viewed", { feature: "weekly_recap" });
    } catch (error) {
      setAiErr(aiAssistantErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section className="workspace-card mt-4 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--color-primary)]" />
            <p className="brand-kicker">This week</p>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
            {summary?.updatesPosted
              ? `You showed up ${summary.activeDays} day${summary.activeDays === 1 ? "" : "s"}.`
              : "A fresh week is still yours."}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            A quiet day is information, not failure. The next check-in is the one that matters.
          </p>
          <div className="mt-4 max-w-xl space-y-2">
            <AiAssistButton
              label={reflection ? "Refresh reflection" : "Reflect on this week"}
              busyLabel="Reflecting on your week…"
              busy={aiBusy}
              disabled={summary === undefined}
              onClick={() => void requestReflection()}
            />
            {aiErr ? <p className="text-xs text-[var(--color-danger-text)]">{aiErr}</p> : null}
            {reflection ? (
              <div className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  {reflection.highlight}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text)]">{reflection.narrative}</p>
                <p className="mt-3 border-l-2 border-[var(--color-primary)]/35 pl-3 text-xs font-semibold leading-5 text-[var(--color-text)]">
                  {reflection.reflectionQuestion}
                </p>
                <AiDraftDisclosure />
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Link
            href="/dashboard/recap"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            <Sparkles size={15} />
            View {new Date().getFullYear() - 1} recap
            <ArrowRight size={14} />
          </Link>
          {summary?.leadingStreak ? (
            <Link
              href={`/dashboard/${summary.leadingStreak.goalId}`}
              className="inline-flex items-center gap-2 border-b border-[var(--color-text)] pb-1 text-sm font-bold"
            >
              <Flame size={15} className="text-[var(--color-gold-text)]" />
              {summary.leadingStreak.current} day streak
              <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-2 lg:border-r lg:border-[var(--color-border)] xl:grid-cols-4">
          <WeekStat value={summary?.updatesPosted} label="updates" loading={summary === undefined} />
          <WeekStat value={summary?.goalsMoved} label="goals moved" loading={summary === undefined} />
          <WeekStat value={summary?.peopleShowingUp} label="people showed up" loading={summary === undefined} />
          <WeekStat value={summary?.achievementsEarned} label="achievements" loading={summary === undefined} />
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Daily rhythm
          </p>
          <div className="mt-4 grid grid-cols-7 gap-2" aria-label="Updates over the last seven days">
            {(summary?.days ?? Array.from({ length: 7 }, (_, index) => ({ key: `loading-${index}`, count: 0 }))).map(
              (day: { key: string; count: number }) => (
                <div key={day.key} className="text-center">
                  <div
                    className={`mx-auto flex h-9 w-full max-w-9 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                      day.count > 0
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-[var(--color-text-dim)]"
                    }`}
                    title={`${day.count} update${day.count === 1 ? "" : "s"}`}
                  >
                    {day.count || "·"}
                  </div>
                  <span className="mt-2 block text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
                    {day.key.startsWith("loading")
                      ? "—"
                      : new Date(`${day.key}T00:00:00Z`).toLocaleDateString(undefined, {
                          weekday: "narrow",
                          timeZone: "UTC",
                        })}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeekStat({ value, label, loading }: { value?: number; label: string; loading: boolean }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="font-display text-2xl font-bold tracking-[-0.04em] tabular-nums">
        {loading ? "—" : value ?? 0}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
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
        src="/illustrations/journey/begin.webp"
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
        className="workspace-button-primary mt-6 w-auto px-5"
      >
        Create your first goal <Plus size={15} />
      </Link>
    </div>
  );
}
