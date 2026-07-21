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

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Heart; color: string }
> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-rose-400" },
  accountability: {
    label: "Accountability",
    icon: Calendar,
    color: "text-emerald-400",
  },
  advice: { label: "Advice", icon: Lightbulb, color: "text-amber-400" },
  review: { label: "Review", icon: Target, color: "text-sky-400" },
  challenge: { label: "Challenge", icon: Users, color: "text-violet-400" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After each update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

export default function MotivatePage() {
  return (
    <RequireAuth>
      <MotivateContent />
    </RequireAuth>
  );
}

function MotivateContent() {
  const pledges = useQuery(api.motivation.listMyMotivations, {
    includeStatuses: ["active", "paused"],
  });
  const goals = useQuery(api.goals.listMine);

  // We need to look up the goal titles for each pledge. Quick path: query
  // each goal. The listMyMotivations only returns goalId; the title is
  // denormalized on invites but not pledges, so we make a follow-up query
  // per pledge. For the MVP this is fine — the list is at most a few rows.
  const goalTitleById = new Map<string, string>();
  if (goals) {
    for (const g of goals) goalTitleById.set(g._id, g.title);
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Your commitments
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Goals I motivate
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            The people who asked you to be in their circle.
          </p>
        </motion.div>

        {pledges === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        ) : pledges.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Sparkles size={18} />
            </div>
            <h2 className="text-base font-semibold">No active commitments</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--color-text-muted)]">
              When you accept a Motivation Circle invite, the goal will show up
              here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
            >
              Browse goals
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pledges.map((p) => {
              const meta = ROLE_META[p.role] ?? ROLE_META.encourager;
              const Icon = meta.icon;
              return (
                <Link
                  key={p._id}
                  href={`/o/${p.goalId}`}
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 transition hover:border-[var(--color-accent)]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-elev)] ${meta.color}`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <div className="truncate text-sm font-semibold">
                          {goalTitleById.get(p.goalId) ?? "Goal"}
                        </div>
                        {p.isCoreMotivator && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-accent)]">
                            <Check size={8} />
                            Core circle
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                        {meta.label} · {FREQ_LABEL[p.checkInFrequency] ?? p.checkInFrequency}
                      </div>
                      {p.pledgeText && (
                        <div className="mt-1 text-[11px] italic text-[var(--color-text-muted)]">
                          "{p.pledgeText}"
                        </div>
                      )}
                    </div>
                    <ArrowRight size={14} className="mt-1 text-[var(--color-text-dim)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
