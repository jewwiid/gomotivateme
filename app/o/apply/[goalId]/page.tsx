"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock,
  Heart,
  Lightbulb,
  Calendar,
  Target,
  Users,
  Sparkles,
  Send,
  X,
  Lock,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Header } from "@/components/Header";

const ROLE_META: Record<
  string,
  { label: string; description: string; icon: typeof Heart; color: string }
> = {
  encourager: {
    label: "Encouragement",
    description: "Cheer them on when motivation dips",
    icon: Heart,
    color: "text-rose-500",
  },
  accountability: {
    label: "Accountability",
    description: "Keep them honest on a schedule",
    icon: Calendar,
    color: "text-emerald-600",
  },
  advice: {
    label: "Practical advice",
    description: "Specific tips, resources, know-how",
    icon: Lightbulb,
    color: "text-amber-500",
  },
  review: {
    label: "Progress review",
    description: "Review milestones and give feedback",
    icon: Target,
    color: "text-sky-600",
  },
  challenge: {
    label: "Join the challenge",
    description: "Set your own version of the same goal",
    icon: Users,
    color: "text-violet-500",
  },
};

const FREQ_META: Record<string, { label: string; description: string }> = {
  afterUpdate: { label: "After each update", description: "React to each milestone" },
  weekly: { label: "Weekly", description: "A regular weekly check-in" },
  monthly: { label: "Monthly", description: "A monthly milestone review" },
  onRequest: { label: "On request", description: "Stand by — they'll reach out" },
};

function ApplyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto max-w-[90rem] px-5 py-12 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}

export default function ApplyPage() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId as Id<"goals">;
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  const goal = useQuery(api.public.getGoalById, { goalId });
  const myApplication = useQuery(api.motivation.myApplicationForGoal, { goalId });
  const myPledges = useQuery(api.motivation.listMyMotivations, {
    includeStatuses: ["active", "paused"],
  });

  const requestApplication = useMutation(api.motivation.requestApplication);

  const [role, setRole] = useState<string>("encourager");
  const [frequency, setFrequency] = useState<string>("weekly");
  const [message, setMessage] = useState("");
  const [pledgeText, setPledgeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<null | "pending" | "auto-accepted">(null);

  if (userLoading || goal === undefined) {
    return (
      <ApplyShell>
        <div className="flex min-h-[58dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#deddd6] border-t-[var(--color-primary)]" />
        </div>
      </ApplyShell>
    );
  }

  if (goal === null) {
    return (
      <ApplyShell>
      <div className="mx-auto flex min-h-[58dvh] max-w-lg flex-col items-center justify-center text-center">
        <p className="brand-kicker">Application</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">Goal not found</h1>
        <p className="mt-4 text-sm leading-6 text-[#686963]">
          This goal may have been removed or made private.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Go home
        </Link>
      </div>
      </ApplyShell>
    );
  }

  // Not signed in — send to signup with return_to.
  if (!user) {
    return (
      <ApplyShell>
        <div className="mx-auto max-w-2xl py-6 sm:py-12">
          <Link
            href={`/o/${goal.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#686963] transition hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={12} />
            Back to goal
          </Link>
          <p className="brand-kicker mt-12">Join the circle</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[0.94] tracking-[-0.06em] sm:text-6xl">
            Apply to motivate
            <br />
            <span className="text-[var(--color-primary)]">{goal.title}</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[#686963]">
            Create an account to apply. Your application will include a short
            note explaining how you can help.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href={`/signup?redirect=${encodeURIComponent(`/o/apply/${goalId}`)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              Create account
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/o/apply/${goalId}`)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c9c8c0] bg-white px-5 py-3 text-sm font-semibold text-[#292929] transition hover:border-[var(--color-primary)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </ApplyShell>
    );
  }

  // Own goal — can't apply to your own.
  if (user._id === goal.ownerId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight">This is your own goal</h1>
          <p className="mt-3 text-sm text-zinc-600">
            You can't apply to your own goal. Manage your circle from the
            dashboard.
          </p>
          <Link
            href={`/dashboard/${goalId}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Already motivating.
  const alreadyMotivating = (myPledges ?? []).some(
    (p) => p.goalId === goalId && (p.status === "active" || p.status === "paused")
  );
  if (alreadyMotivating) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check size={20} />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            You're already motivating this goal
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            You can change your settings anytime from the Goals I motivate page.
          </p>
          <Link
            href="/motivate"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Goals I motivate
          </Link>
        </div>
      </div>
    );
  }

  // Already applied.
  if (myApplication && myApplication.status === "pending") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock size={20} />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Your application is pending
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            The goal owner will see it and decide. We'll let you know here.
          </p>
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Your message
            </div>
            <div className="mt-1">"{myApplication.message}"</div>
          </div>
          <Link
            href={`/o/${goal.slug}`}
            className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            Back to goal
          </Link>
        </div>
      </div>
    );
  }
  if (myApplication && myApplication.status === "declined") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
            <X size={20} />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Your application was declined
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            The goal owner decided not to add you. That's fine — there are
            plenty of other goals to support.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Browse goals
          </Link>
        </div>
      </div>
    );
  }
  if (myApplication && myApplication.status === "accepted") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check size={20} />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            You're motivating this goal
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            You'll see it on your Goals I motivate page.
          </p>
          <Link
            href="/motivate"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Goals I motivate
          </Link>
        </div>
      </div>
    );
  }

  // Goal is closed.
  if (goal.status === "closed") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight">This goal is closed</h1>
          <p className="mt-3 text-sm text-zinc-600">
            The owner closed this goal. New motivators can't be added.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Browse goals
          </Link>
        </div>
      </div>
    );
  }

  // Goal is in pre-launch and disabled public motivators.
  if (goal.status === "draft" && goal.publicMotivatorPolicy === "disabled") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight">
            {goal.title}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            The goal owner is still building their private circle and isn't
            taking public applications yet.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Browse goals
          </Link>
        </div>
      </div>
    );
  }

  // Pre-launch but publicMotivatorPolicy allows (approval or auto).
  const isPreLaunch = goal.status === "draft";
  const isAuto = goal.publicMotivatorPolicy === "auto";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length === 0) {
      setErr("Tell the goal owner how you can help");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await requestApplication({
        goalId,
        requestedRole: role as any,
        requestedFrequency: frequency as any,
        message: message.trim(),
        pledgeText: pledgeText.trim() || undefined,
      });
      if (result.kind === "auto-accepted") {
        router.push("/motivate?from=" + goalId);
        return;
      }
      setSubmitted("pending");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (submitted === "pending") {
    return (
      <ApplyShell>
        <div className="mx-auto max-w-xl py-12 sm:py-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff5dd] text-[#9a6900]">
              <Clock size={24} />
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">
              Application sent
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#686963]">
              The goal owner will see your application and decide. If they accept,
              you'll be added to their Motivation Circle.
            </p>
            <Link
              href={`/o/${goal.slug}`}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              Back to goal
            </Link>
          </motion.div>
        </div>
      </ApplyShell>
    );
  }

  return (
    <ApplyShell>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(30rem,1fr)] lg:gap-20">
        <aside className="lg:pt-2">
          <Link
            href={`/o/${goal.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#686963] transition hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={14} />
            Back to goal
          </Link>
          <p className="brand-kicker mt-12">Join the circle</p>
          <h1 className="mt-3 max-w-lg font-display text-5xl font-bold leading-[0.92] tracking-[-0.06em] sm:text-6xl">
            {goal.title}
          </h1>
          {goal.summary && (
            <p className="mt-5 max-w-md text-base leading-7 text-[#686963]">{goal.summary}</p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/motivation-circle-v3.webp"
            alt="A circle of people showing up for a shared goal"
            className="mt-10 h-44 w-44 object-contain"
          />
        </aside>

        <section className="flow-form max-w-2xl lg:border-l lg:border-[#deddd6] lg:pl-12">
        {isPreLaunch && (
          <div className="inline-flex items-center gap-2 border-b border-[var(--color-gold)] pb-2 text-xs font-semibold text-[#8a6510]">
            <Lock size={12} />
            Pre-launch · {goal.ownerName ?? "Someone"} is still building their circle
          </div>
        )}

        <h2 className="mt-6 font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em] sm:text-5xl">
          How will you show up?
        </h2>

        {isAuto && (
          <div className="mt-5 inline-flex items-center gap-2 border-b border-[#b8d8c4] pb-2 text-xs font-semibold text-[#248451]">
            <Sparkles size={12} />
            Auto-accept · you'll join the circle right away
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-9 space-y-8">
          <div>
            <div className="brand-kicker">
              How would you like to help?
            </div>
            <div className="mt-3 border-y border-[#deddd6]">
              {Object.entries(ROLE_META).map(([id, m]) => {
                const Icon = m.icon;
                const active = role === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={`flex w-full items-center gap-3 border-b border-[#e4e2da] px-2 py-4 text-left transition last:border-b-0 ${
                      active
                        ? "bg-[#eef3ff] text-[var(--color-primary)]"
                        : "bg-transparent hover:bg-white"
                    }`}
                  >
                    <div className={`shrink-0 ${m.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#292929]">
                        {m.label}
                      </div>
                      <div className="text-[11px] text-[#777872]">
                        {m.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="brand-kicker">
              Cadence
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(FREQ_META).map(([id, m]) => {
                const active = frequency === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFrequency(id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-[var(--color-primary)] bg-[#eef3ff]"
                        : "border-[#deddd6] bg-white hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#292929]">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-[#777872]">{m.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="brand-kicker"
            >
              Message to {goal.ownerName ?? "the goal owner"}
            </label>
            <p className="mt-1 text-[11px] leading-5 text-[#777872]">
              Be specific about why you're a good fit. Mention any relevant
              experience or what you'll actually do.
            </p>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isAuto
                  ? "e.g. I've done a 5K training plan twice — happy to share what worked."
                  : "e.g. I've completed a similar goal last year. I'd love to review your monthly milestones."
              }
              required
              minLength={20}
              maxLength={500}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#9aa0a0] focus:border-[var(--color-primary)] focus:outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-[#777872]">
              {message.length}/500
            </div>
          </div>

          <div>
            <label
              htmlFor="pledge"
              className="brand-kicker"
            >
              Public pledge (optional)
            </label>
            <p className="mt-1 text-[11px] leading-5 text-[#777872]">
              A short sentence shown on the goal page so the goal owner knows
              what you're committing to.
            </p>
            <input
              id="pledge"
              type="text"
              value={pledgeText}
              onChange={(e) => setPledgeText(e.target.value)}
              placeholder="e.g. Check in every Sunday"
              maxLength={140}
              className="mt-2 w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#9aa0a0] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          {err && (
            <div className="border-l-4 border-[var(--color-danger)] bg-[#fff2f2] px-4 py-3 text-sm text-[#a53b3b]">
              {err}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/o/${goal.slug}`}
              className="text-sm text-[#686963] transition hover:text-[var(--color-primary)]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy || message.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              <Send size={14} />
              {busy
                ? "Sending…"
                : isAuto
                ? "Join the circle"
                : "Send application"}
            </button>
          </div>
        </form>
        </section>
      </div>
    </ApplyShell>
  );
}
