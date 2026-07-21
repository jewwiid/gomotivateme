"use client";

import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Lightbulb,
  Calendar,
  Users,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";

type SupportType = "encourage" | "experience" | "advice" | "checkin" | "join";

const SUPPORT_META: Record<
  SupportType,
  { label: string; description: string; prompt: string; icon: typeof Heart; emoji: string }
> = {
  encourage: {
    label: "Encourage them",
    description: "Cheer them on. Tell them why you believe they can do it.",
    prompt: "What would you like them to remember when motivation gets difficult?",
    icon: Heart,
    emoji: "💛",
  },
  experience: {
    label: "Share relevant experience",
    description: "You've done something similar. Share what worked for you.",
    prompt: "Have you completed a similar goal? Share something that helped you.",
    icon: Sparkles,
    emoji: "✨",
  },
  advice: {
    label: "Offer practical advice",
    description: "You have specific tips, resources, or know-how to offer.",
    prompt: "What's one concrete tip that would help them right now?",
    icon: Lightbulb,
    emoji: "💡",
  },
  checkin: {
    label: "Check in regularly",
    description: "Commit to a non-financial pledge of your time and attention.",
    prompt: "How will you show up for them? (e.g. 'Every Sunday morning')",
    icon: Calendar,
    emoji: "📆",
  },
  join: {
    label: "Join the challenge",
    description: "Do it together. Set your own version of the same goal.",
    prompt: "Tell them you'll be working on it alongside them.",
    icon: Users,
    emoji: "🤝",
  },
};

const FREQ_OPTIONS = [
  { value: "daily" as const, label: "Every day" },
  { value: "weekly" as const, label: "Every week" },
  { value: "monthly" as const, label: "Every month" },
  { value: "justThisOne" as const, label: "Just this one" },
];

interface StructuredSupportComposerProps {
  goalId: Id<"goals">;
  /** What the creator is asking for — only show those types. */
  allowedTypes: SupportType[];
  onJoined?: () => void;
}

export function StructuredSupportComposer({
  goalId,
  allowedTypes,
  onJoined,
}: StructuredSupportComposerProps) {
  const { user, isAuthenticated } = useCurrentUser();
  const joinSupport = useMutation(api.supporters.join);
  const createMessage = useMutation(api.supportMessages.create);
  const amISupporting = useQuery(api.supporters.amISupporting, { goalId });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "compose">("type");
  const [supportType, setSupportType] = useState<SupportType | null>(null);
  const [body, setBody] = useState("");
  const [pledge, setPledge] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "justThisOne">(
    "weekly"
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const typesToShow = allowedTypes.length > 0 ? allowedTypes : (Object.keys(SUPPORT_META) as SupportType[]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-6 text-center">
        <h3 className="text-base font-semibold">Sign in to support this goal</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Supporters make a real commitment — that's why we ask you to sign in.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
        >
          Sign in
        </a>
      </div>
    );
  }

  // If the user is already a supporter, show a brief confirmation card instead.
  if (amISupporting && !open) {
    const meta = SUPPORT_META[amISupporting.supportType as SupportType] ?? SUPPORT_META.encourage;
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className="text-sm font-semibold">
            You're supporting as "{meta.label.toLowerCase()}"
          </span>
        </div>
        {amISupporting.pledge && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            "{amISupporting.pledge}"
          </p>
        )}
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
        >
          Update your support
        </button>
      </motion.div>
    );
  }

  if (done && !open) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-6 text-center"
      >
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
          <Check size={20} />
        </div>
        <h3 className="text-base font-semibold">You're on the team 🎉</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {user?.name ? `Thanks, ${user.name.split(" ")[0]}.` : "Thanks."} They'll see your support.
        </p>
        <button
          onClick={() => {
            setDone(false);
            setOpen(false);
            setStep("type");
            setSupportType(null);
            setBody("");
            setPledge("");
          }}
          className="mt-3 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Update support
        </button>
      </motion.div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-6 py-4 text-base font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
      >
        Support this goal
      </button>
    );
  }

  const onSubmit = async () => {
    if (!supportType) return;
    setBusy(true);
    setErr(null);
    try {
      await joinSupport({
        goalId,
        supportType,
        pledge: pledge || undefined,
        checkInFrequency: supportType === "checkin" ? frequency : undefined,
      });
      if (body.trim()) {
        await createMessage({ goalId, supportType, body });
      }
      setDone(true);
      setOpen(true); // keep open so the success card shows
      onJoined?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your support");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-[var(--color-accent)]/30 bg-[var(--color-bg-card)] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Support this goal</h3>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)]"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === "type" && (
          <motion.div
            key="type"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              How would you like to support {user?.name?.split(" ")[0] || "them"}?
            </p>
            {typesToShow.map((t) => {
              const meta = SUPPORT_META[t];
              const Icon = meta.icon;
              const active = supportType === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setSupportType(t);
                    setStep("compose");
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg)] text-base">
                    {meta.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {meta.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {step === "compose" && supportType && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="space-y-3"
          >
            <button
              onClick={() => setStep("type")}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← Change support type
            </button>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
              <div className="text-sm font-semibold">
                {SUPPORT_META[supportType].emoji} {SUPPORT_META[supportType].label}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                {SUPPORT_META[supportType].prompt}
              </div>
            </div>

            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Your message..."
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <div className="text-right text-[10px] text-[var(--color-text-dim)]">
              {body.length}/1000
            </div>

            <div className="border-t border-[var(--color-border)] pt-3">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                Make a non-financial pledge <span className="text-[var(--color-text-dim)]">(optional)</span>
              </label>
              <input
                value={pledge}
                onChange={(e) => setPledge(e.target.value)}
                placeholder="e.g. I'll check in every Sunday"
                maxLength={200}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {supportType === "checkin" && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                    How often?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FREQ_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFrequency(opt.value)}
                        className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                          frequency === opt.value
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-2.5 text-sm font-medium transition hover:border-[var(--color-border-strong)]"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={busy}
                className="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send support"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
