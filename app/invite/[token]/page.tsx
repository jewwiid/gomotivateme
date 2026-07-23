"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  Heart,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Header } from "@/components/Header";

const ROLE_META: Record<
  string,
  { label: string; description: string; icon: typeof Heart; color: string }
> = {
  encourager: {
    label: "Encourager",
    description: "Cheer them on when motivation dips",
    icon: Heart,
    color: "bg-[#eef3ff] text-[var(--color-primary)]",
  },
  accountability: {
    label: "Accountability partner",
    description: "Keep them honest on a schedule",
    icon: Calendar,
    color: "bg-[#eef3ff] text-[var(--color-primary)]",
  },
  advice: {
    label: "Experienced adviser",
    description: "Practical tips, resources, know-how",
    icon: Lightbulb,
    color: "bg-[#eef3ff] text-[var(--color-primary)]",
  },
  review: {
    label: "Progress reviewer",
    description: "Review milestones and give feedback",
    icon: Target,
    color: "bg-[#eef3ff] text-[var(--color-primary)]",
  },
  challenge: {
    label: "Challenge partner",
    description: "Set your own version of the same goal",
    icon: Users,
    color: "bg-[#eef3ff] text-[var(--color-primary)]",
  },
};

const FREQUENCY_META: Record<
  string,
  { label: string; description: string }
> = {
  afterUpdate: {
    label: "After every progress update",
    description: "React to each new milestone or value",
  },
  weekly: {
    label: "Once a week",
    description: "A regular weekly check-in",
  },
  monthly: {
    label: "Once a month",
    description: "A monthly milestone review",
  },
  onRequest: {
    label: "Only when I ask for help",
    description: "Stand by — they'll reach out when they need you",
  },
};

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto max-w-[72rem] px-5 py-12 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const invite = useQuery(api.motivation.getInviteByToken, {
    token: params.token,
  });

  const accept = useMutation(api.motivation.acceptInvite);
  const decline = useMutation(api.motivation.declineInvite);

  const [step, setStep] = useState<"view" | "accept" | "decline">("view");
  const [role, setRole] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [pledgeText, setPledgeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (userLoading || invite === undefined) {
    return (
      <InviteShell>
        <div className="flex min-h-[58dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#deddd6] border-t-[var(--color-primary)]" />
        </div>
      </InviteShell>
    );
  }

  if (invite === null) {
    return (
      <InviteShell>
      <div className="mx-auto flex min-h-[58dvh] max-w-lg flex-col items-center justify-center text-center">
        <p className="brand-kicker">Invitation</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">Invite not found</h1>
        <p className="mt-4 text-sm leading-6 text-[#686963]">
          This invitation link may have expired or been revoked.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Go home
        </Link>
      </div>
      </InviteShell>
    );
  }

  const isOwnInvite = user && invite.creatorId === user._id;
  const isAlreadyResponded = invite.status !== "pending";

  // Not signed in yet — send to login with a return URL.
  if (!user) {
    return (
      <InviteShell>
      <div className="mx-auto flex min-h-[58dvh] max-w-lg flex-col items-center justify-center text-center">
        <Sparkles size={28} className="mb-4 text-[var(--color-primary)]" />
        <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">You're invited</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[#686963]">
          Someone has asked you to join their Motivation Circle for{" "}
          <span className="font-semibold text-[var(--color-text)]">
            "{invite.goalTitle}"
          </span>
          . Sign in to respond.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={`/login?redirect=${encodeURIComponent(`/invite/${invite.token}`)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c9c8c0] bg-white px-4 py-2.5 text-sm font-semibold text-[#292929] transition hover:border-[var(--color-primary)]"
          >
            Sign in
          </Link>
          <Link
            href={`/signup?redirect=${encodeURIComponent(`/invite/${invite.token}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Create account
          </Link>
        </div>
      </div>
      </InviteShell>
    );
  }

  if (isOwnInvite) {
    return (
      <InviteShell>
      <div className="mx-auto flex min-h-[58dvh] max-w-lg flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">This is your own goal</h1>
        <p className="mt-4 text-sm leading-6 text-[#686963]">
          You can't accept an invite to a goal you created. Manage your invites from
          the dashboard.
        </p>
        <Link
          href={`/dashboard/${invite.goalId}`}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Open dashboard
        </Link>
      </div>
      </InviteShell>
    );
  }

  if (isAlreadyResponded) {
    return (
      <InviteShell>
      <div className="mx-auto flex min-h-[58dvh] max-w-lg flex-col items-center justify-center text-center">
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            invite.status === "accepted"
              ? "bg-[#edf7f0] text-[#248451]"
              : "bg-[#f0efe9] text-[#686963]"
          }`}
        >
          {invite.status === "accepted" ? (
            <Check size={24} />
          ) : (
            <X size={24} />
          )}
        </div>
        <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.055em]">
          {invite.status === "accepted"
            ? "You've accepted"
            : invite.status === "declined"
            ? "You've declined"
            : "This invite has expired"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#686963]">
          {invite.status === "accepted"
            ? "You're part of the Motivation Circle for this goal. You'll see it on your Goals I motivate page."
            : "No further action needed."}
        </p>
        <Link
          href={invite.status === "accepted" ? "/motivate" : "/"}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          {invite.status === "accepted" ? "View my goals to motivate" : "Go home"}
        </Link>
      </div>
      </InviteShell>
    );
  }

  const RoleIcon = ROLE_META[invite.proposedRole]?.icon ?? Heart;
  const roleMeta = ROLE_META[invite.proposedRole];
  const freqMeta = FREQUENCY_META[invite.proposedFrequency];

  const onAccept = async () => {
    setBusy(true);
    setErr(null);
    try {
      const result = await accept({
        token: invite.token,
        role: role ? (role as any) : undefined,
        checkInFrequency: frequency ? (frequency as any) : undefined,
        pledgeText: pledgeText.trim() || undefined,
      });
      router.push(`/motivate?from=${result.goalId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  const onDecline = async () => {
    setBusy(true);
    setErr(null);
    try {
      await decline({ token: invite.token });
      // Show a "thanks, we'll let them know" state in the same component.
      setStep("view");
      // Re-query will surface status === "declined".
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <InviteShell>
      <div className="mx-auto max-w-[42rem]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#686963] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={12} />
          gomotivateme
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="brand-kicker inline-flex items-center gap-2">
            <Sparkles size={12} />
            Motivation Circle invite
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/motivation-circle-v3.webp"
            alt=""
            aria-hidden
            className="mx-auto mt-6 h-36 w-36 select-none object-contain sm:h-44 sm:w-44"
          />

          <h1 className="mt-5 font-display text-4xl font-bold leading-[0.92] tracking-[-0.06em] sm:text-6xl">
            You've been invited to motivate
            <br />
            <span className="text-[var(--color-primary)]">{invite.goalTitle}</span>
          </h1>

          {invite.personalMessage && (
            <blockquote className="mt-8 border-l-4 border-[var(--color-primary)] px-5 text-left text-base leading-7 text-[#686963]">
              <span>“{invite.personalMessage}”</span>
            </blockquote>
          )}

          <div className="mt-9 grid border-y border-[#deddd6] text-left sm:grid-cols-2 sm:divide-x sm:divide-[#deddd6]">
            <div className="py-5 sm:pr-6">
              <div className="brand-kicker">
                Role
              </div>
              <div className="mt-2 flex items-start gap-3">
                <div
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    roleMeta?.color ?? "bg-[#eef3ff] text-[var(--color-primary)]"
                  }`}
                >
                  <RoleIcon size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{roleMeta?.label}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {roleMeta?.description}
                  </div>
                </div>
              </div>
            </div>
            <div className="py-5 sm:pl-6">
              <div className="brand-kicker">
                Cadence
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold">{freqMeta?.label}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {freqMeta?.description}
                </div>
              </div>
            </div>
          </div>

          {/* Already-responded state — show inline */}
          {invite.status !== "pending" && (
            <div className="mt-6 border-y border-[#deddd6] py-4 text-sm text-[#686963]">
              {invite.status === "accepted"
                ? "You've already accepted this invitation. You can change your settings anytime from your Goals I motivate page."
                : invite.status === "declined"
                ? "You've declined this invitation. The goal owner has been notified."
                : "This invitation has expired."}
            </div>
          )}

          {/* Default action row */}
          {step === "view" && invite.status === "pending" && (
            <div className="mt-8 flex flex-col gap-3 text-left sm:flex-row">
              <button
                onClick={() => setStep("accept")}
                disabled={busy}
                className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                <Check size={14} />
                Accept pledge
              </button>
              <button
                onClick={() => {
                  /* MVP: redirect to the goal page or open a mailto. For now
                     a no-op + toast is enough; the spec defers real messaging. */
                  setErr(
                    "For now, drop the goal owner a note directly. We'll add in-app questions in a follow-up."
                  );
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9c8c0] bg-white px-5 py-3 text-sm font-semibold text-[#292929] transition hover:border-[var(--color-primary)]"
              >
                <MessageSquare size={14} />
                Ask a question
              </button>
              <button
                onClick={onDecline}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-[#686963] transition hover:text-[var(--color-danger)] disabled:opacity-50"
              >
                <X size={14} />
                Decline
              </button>
            </div>
          )}

          {/* Accept — customize role/frequency + optional pledge text */}
          <AnimatePresence>
            {step === "accept" && (
              <motion.div
                key="accept"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 border-t border-[#deddd6] pt-7 text-left"
              >
                <div className="brand-kicker">
                  Make it yours
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Tweak the role or cadence if it doesn't fit. Anything you don't change
                  stays as proposed.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="brand-kicker">
                      Role
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(ROLE_META).map(([id, m]) => {
                        const Icon = m.icon;
                        const active = (role ?? invite.proposedRole) === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setRole(id)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                              active
                                ? "border-[var(--color-primary)] bg-[#eef3ff]"
                                : "border-[#deddd6] bg-white hover:border-[var(--color-primary)]"
                            }`}
                          >
                            <div
                              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.color}`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold">{m.label}</div>
                              <div className="truncate text-[10px] text-[var(--color-text-muted)]">
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
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(FREQUENCY_META).map(([id, m]) => {
                        const active = (frequency ?? invite.proposedFrequency) === id;
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
                            <div className="text-xs font-semibold">{m.label}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">
                              {m.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="brand-kicker">
                      Public pledge (optional)
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      A short sentence shown on the goal page so the goal owner knows
                      what you're committing to.
                    </p>
                    <textarea
                      value={pledgeText}
                      onChange={(e) => setPledgeText(e.target.value)}
                      placeholder="e.g. Check in every Sunday evening"
                      maxLength={140}
                      rows={2}
                      className="mt-2 w-full resize-none rounded-xl border border-[#c9c8c0] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                {err && <p className="mt-3 text-xs text-[var(--color-danger)]">{err}</p>}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setStep("view")}
                    disabled={busy}
                    className="rounded-xl border border-[#c9c8c0] bg-white px-4 py-2 text-sm font-semibold text-[#292929] transition hover:border-[var(--color-primary)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                  >
                    <Check size={14} />
                    {busy ? "Accepting…" : "Accept and join the circle"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </InviteShell>
  );
}
