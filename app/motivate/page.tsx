"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Heart,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardWorkspaceShell } from "@/components/DashboardWorkspaceShell";
import { RequireAuth } from "@/components/RequireAuth";
import { CheckInComposer } from "@/components/CheckInComposer";

const ROLE_META: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-[var(--color-danger)]" },
  accountability: { label: "Accountability", icon: Calendar, color: "text-[var(--color-success-text)]" },
  advice: { label: "Advice", icon: Lightbulb, color: "text-[var(--color-gold-text)]" },
  review: { label: "Review", icon: Target, color: "text-[var(--color-primary)]" },
  challenge: { label: "Challenge", icon: Users, color: "text-[var(--color-primary)]" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After each update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

const ROW_MEDIA = [
  "/illustrations/journey/support.webp",
  "/illustrations/journey/move.webp",
  "/illustrations/journey/return.webp",
  "/illustrations/journey/milestone.webp",
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
    <DashboardWorkspaceShell active="circle">
      <main className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="brand-kicker">Your commitments</p>
            <h1 className="mt-2 max-w-3xl title-page">
              Goals you’re showing up for.
            </h1>
            <Link href="/explore" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3">
              Explore more goals <ArrowRight size={16} />
            </Link>
          </motion.div>

          {pledges === undefined ? (
            <div className="workspace-card mt-7 divide-y divide-[var(--color-border)] overflow-hidden">
              {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse bg-[var(--color-bg-elev)]" />)}
            </div>
          ) : pledges.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="workspace-card mt-7 divide-y divide-[var(--color-border)] overflow-hidden px-5">
              {pledges.map((pledge, index) => (
                <MotivateRow
                  key={pledge._id}
                  pledge={pledge}
                  index={index}
                  goalTitle={goalTitleById.get(pledge.goalId)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="workspace-card p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
            <Sparkles size={25} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-[-0.045em]">Keep it simple</h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
            A few words can keep someone going.
          </p>
        </aside>
      </main>
    </DashboardWorkspaceShell>
  );
}

function MotivateRow({
  pledge,
  index,
  goalTitle,
}: {
  pledge: {
    _id: Id<"motivatorPledges">;
    goalId: string;
    goalSlug?: string | null;
    ownerHandle?: string | null;
    role: string;
    checkInFrequency: string;
    pledgeText: string | null;
    status: string;
    isCoreMotivator: boolean;
    lastCheckInAt: number | null;
  };
  index: number;
  goalTitle?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = ROLE_META[pledge.role] ?? ROLE_META.encourager;
  const Icon = meta.icon;

  const lastCheckInLabel = pledge.lastCheckInAt
    ? `Last check-in ${timeAgoShort(pledge.lastCheckInAt)}`
    : "No check-ins yet";

  const goalHref = pledge.goalSlug
    ? `/o/${pledge.ownerHandle ?? ""}/${pledge.goalSlug}`
    : `/o/apply/${pledge.goalId}`;

  return (
    <div className="py-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-7">
        <Link
          href={goalHref}
          className="group aspect-[1.7/1] overflow-hidden rounded-xl bg-[var(--color-primary-soft)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ROW_MEDIA[index % ROW_MEDIA.length]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        </Link>
        <div className="min-w-0">
          <Link href={goalHref} className="group">
            <h2 className="truncate font-display text-2xl font-bold tracking-[-0.04em] transition group-hover:text-[var(--color-primary)]">
              {goalTitle ?? "A goal in your circle"}
            </h2>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.color}`}><Icon size={15} /> {meta.label}</span>
            <span className="h-4 w-px bg-[var(--color-bg-sunken)]" />
            <span>{FREQ_LABEL[pledge.checkInFrequency] ?? pledge.checkInFrequency}</span>
            <span className="h-4 w-px bg-[var(--color-bg-sunken)]" />
            <span className="text-[var(--color-text-dim)]">{lastCheckInLabel}</span>
          </div>
          {pledge.pledgeText && <p className="mt-2 line-clamp-1 text-sm italic text-[var(--color-text-muted)]">“{pledge.pledgeText}”</p>}
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">{pledge.isCoreMotivator ? "Core" : "Community"}</span>
          <WithdrawPledgeButton pledgeId={pledge._id} />
          <button
            onClick={() => setExpanded((e) => !e)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              expanded
                ? "bg-[var(--color-bg-elev)] text-[var(--color-text)]"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
            }`}
          >
            <MessageSquare size={13} />
            Check in
          </button>
        </div>
      </div>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="mt-4 overflow-hidden pl-0 sm:pl-[calc(11rem+1.75rem)]"
        >
          <CheckInComposer pledgeId={pledge._id} onDone={() => setExpanded(false)} />
        </motion.div>
      )}
    </div>
  );
}

function timeAgoShort(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return "just now";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function EmptyState() {
  return (
    <div className="workspace-card mt-7 grid place-items-center border-dashed px-6 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/journey/support.webp"
        alt=""
        aria-hidden
        className="h-40 w-40 object-cover mix-blend-multiply"
      />
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.035em]">No commitments yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">When someone invites you into their circle, their goal will appear here.</p>
      <Link href="/explore" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]">
        Browse goals <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function WithdrawPledgeButton({ pledgeId }: { pledgeId: Id<"motivatorPledges"> }) {
  const updatePledge = useMutation(api.motivation.updateMyPledge);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await updatePledge({ pledgeId, status: "removed" });
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
          disabled={busy}
          className="text-xs font-semibold text-[var(--color-danger)] hover:opacity-70 disabled:opacity-50"
        >
          {busy ? "Withdrawing..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-[var(--color-text-dim)] transition hover:text-[var(--color-danger)]"
    >
      Withdraw
    </button>
  );
}
