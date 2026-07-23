"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
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
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { CheckInComposer } from "@/components/CheckInComposer";

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

        <aside className="border-t border-[#deddd6] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[#fdf1ca] text-[#bf8500]">
            <Sparkles size={25} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-[-0.045em]">Keep it simple</h2>
          <p className="mt-4 text-base leading-7 text-[#686963]">
            Small, consistent check-ins make a real difference. A few words can keep someone going.
          </p>
        </aside>
      </main>
    </div>
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

  const goalHref = pledge.goalSlug ? `/o/${pledge.goalSlug}` : `/o/${pledge.goalId}`;

  return (
    <div className="py-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-7">
        <Link
          href={goalHref}
          className="group aspect-[1.7/1] overflow-hidden rounded-xl bg-[#e8edf9]"
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
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#686963]">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.color}`}><Icon size={15} /> {meta.label}</span>
            <span className="h-4 w-px bg-[#deddd6]" />
            <span>{FREQ_LABEL[pledge.checkInFrequency] ?? pledge.checkInFrequency}</span>
            <span className="h-4 w-px bg-[#deddd6]" />
            <span className="text-[#888983]">{lastCheckInLabel}</span>
          </div>
          {pledge.pledgeText && <p className="mt-2 line-clamp-1 text-sm italic text-[#777872]">“{pledge.pledgeText}”</p>}
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <span className="hidden text-sm text-[#686963] sm:inline">{pledge.isCoreMotivator ? "Core" : "Community"}</span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              expanded
                ? "bg-[#f0efe9] text-[#292929]"
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
