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
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  if (goal === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Goal not found</h1>
        <p className="mt-3 text-sm text-zinc-600">
          This goal may have been removed or made private.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Go home
        </Link>
      </div>
    );
  }

  // Not signed in — send to signup with return_to.
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <Link
            href={`/o/${goal.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-700"
          >
            <ArrowLeft size={12} />
            Back to goal
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Apply to motivate
            <br />
            <span className="text-zinc-500">{goal.title}</span>
          </h1>
          <p className="mt-4 text-sm text-zinc-600">
            Create an account to apply. Your application will include a short
            note explaining how you can help.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href={`/signup?return_to=/o/apply/${goalId}`}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Create account
            </Link>
            <Link
              href={`/login?return_to=/o/apply/${goalId}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock size={24} />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Application sent
            </h1>
            <p className="mt-3 max-w-md text-sm text-zinc-600">
              The goal owner will see your application and decide. If they accept,
              you'll be added to their Motivation Circle.
            </p>
            <Link
              href={`/o/${goal.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to goal
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <Link
          href={`/o/${goal.slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-700"
        >
          <ArrowLeft size={12} />
          Back to goal
        </Link>

        {isPreLaunch && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <Lock size={12} />
            Pre-launch · {goal.ownerName ?? "Someone"} is still building their circle
          </div>
        )}

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Apply to motivate
          <br />
          <span className="text-zinc-500">{goal.title}</span>
        </h1>

        {goal.summary && (
          <p className="mt-3 text-sm text-zinc-600">{goal.summary}</p>
        )}

        {isAuto && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <Sparkles size={12} />
            Auto-accept · you'll join the circle right away
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              How would you like to help?
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(ROLE_META).map(([id, m]) => {
                const Icon = m.icon;
                const active = role === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900/5"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className={`shrink-0 ${m.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {m.label}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {m.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Cadence
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(FREQ_META).map(([id, m]) => {
                const active = frequency === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFrequency(id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900/5"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className="text-sm font-semibold text-zinc-900">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-zinc-500">{m.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Message to {goal.ownerName ?? "the goal owner"}
            </label>
            <p className="mt-0.5 text-[11px] text-zinc-500">
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
              className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-zinc-500">
              {message.length}/500
            </div>
          </div>

          <div>
            <label
              htmlFor="pledge"
              className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Public pledge (optional)
            </label>
            <p className="mt-0.5 text-[11px] text-zinc-500">
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
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          {err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/o/${goal.slug}`}
              className="text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy || message.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
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
      </div>
    </div>
  );
}
