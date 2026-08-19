"use client";

import { useAction, useMutation, useQuery } from "convex/react";
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
import { trackDataFastGoal } from "@/lib/analytics";
import { AiAssistButton, AiSuggestionPicker } from "@/components/AiAssist";
import { aiAssistantErrorMessage } from "@/lib/aiAssistant";

type SupportType = "encourage" | "experience" | "advice" | "checkin" | "join";

const SUPPORT_META: Record<
  SupportType,
  { label: string; description: string; prompt: string; icon: typeof Heart }
> = {
  encourage: {
    label: "Encourage them",
    description: "Cheer them on. Tell them why you believe they can do it.",
    prompt: "What would you like them to remember when motivation gets difficult?",
    icon: Heart,
  },
  experience: {
    label: "Share relevant experience",
    description: "You've done something similar. Share what worked for you.",
    prompt: "Have you completed a similar goal? Share something that helped you.",
    icon: Sparkles,
  },
  advice: {
    label: "Offer practical advice",
    description: "You have specific tips, resources, or know-how to offer.",
    prompt: "What's one concrete tip that would help them right now?",
    icon: Lightbulb,
  },
  checkin: {
    label: "Check in regularly",
    description: "Commit to a non-financial pledge of your time and attention.",
    prompt: "How will you show up for them? (e.g. 'Every Sunday morning')",
    icon: Calendar,
  },
  join: {
    label: "Join the challenge",
    description: "Do it together. Set your own version of the same goal.",
    prompt: "Tell them you'll be working on it alongside them.",
    icon: Users,
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
  onRequireSignIn?: () => void;
}

export function StructuredSupportComposer({
  goalId,
  allowedTypes,
  onJoined,
  onRequireSignIn,
}: StructuredSupportComposerProps) {
  const { user, isAuthenticated } = useCurrentUser();
  const joinSupport = useMutation(api.supporters.join);
  const createMessage = useMutation(api.supportMessages.create);
  const draftSupport = useAction(api.aiCoach.draftSupport);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
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

  // Follow-up message form (shown in the "already supporting" card)
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpBody, setFollowUpBody] = useState("");
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpErr, setFollowUpErr] = useState<string | null>(null);
  const [followUpDone, setFollowUpDone] = useState(false);
  const [aiTarget, setAiTarget] = useState<"message" | "followUp" | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ text: string; angle: string }>>([]);
  const [aiRationale, setAiRationale] = useState("");
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiUsageEventId, setAiUsageEventId] = useState<Id<"aiUsageEvents"> | null>(null);

  const typesToShow = allowedTypes.length > 0 ? allowedTypes : (Object.keys(SUPPORT_META) as SupportType[]);

  const requestAiDraft = async (
    target: "message" | "followUp",
    type: SupportType,
    draftText: string
  ) => {
    setAiTarget(target);
    setAiBusy(true);
    setAiErr(null);
    setAiSuggestions([]);
    try {
      const result = await draftSupport({
        goalId,
        supportType: type,
        draftText: draftText.trim() || undefined,
      });
      setAiSuggestions(result.suggestions);
      setAiRationale(result.rationale);
      setAiUsageEventId(result.usageEventId);
    } catch (error) {
      setAiErr(aiAssistantErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  };

  const applyAiDraft = (target: "message" | "followUp", text: string) => {
    if (target === "message") setBody(text);
    else setFollowUpBody(text);
    if (aiUsageEventId) {
      void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "applied" });
    }
    trackDataFastGoal("ai_suggestion_applied", { feature: "support_draft" });
    setAiSuggestions([]);
    setAiErr(null);
  };

  const aiDraftControls = (
    target: "message" | "followUp",
    type: SupportType,
    draftText: string
  ) => (
    <div className="space-y-2">
      <AiAssistButton
        label={draftText.trim() ? "Improve with AI" : "Help me write this"}
        busyLabel="Drafting options…"
        busy={aiBusy && aiTarget === target}
        disabled={aiBusy && aiTarget !== target}
        onClick={() => void requestAiDraft(target, type, draftText)}
      />
      {aiErr && aiTarget === target ? (
        <p className="text-xs text-[var(--color-danger-text)]">{aiErr}</p>
      ) : null}
      {aiTarget === target && aiSuggestions.length > 0 ? (
        <AiSuggestionPicker
          suggestions={aiSuggestions}
          rationale={aiRationale}
          onSelect={(text) => applyAiDraft(target, text)}
          onDismiss={() => {
            if (aiUsageEventId) {
              void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "dismissed" });
            }
            setAiSuggestions([]);
          }}
        />
      ) : null}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-5 text-center">
        <h3 className="text-base font-semibold">Sign in to support this goal</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Supporters make a real commitment. That's why we ask you to sign in.
        </p>
        <button
          type="button"
          onClick={onRequireSignIn}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Sign in
        </button>
        <p className="mt-3 text-xs text-[var(--color-text-dim)]">New here? You can create an account in the next step.</p>
      </div>
    );
  }

  // If the user is already a supporter, show a brief confirmation card instead.
  if (amISupporting && !open) {
    const meta = SUPPORT_META[amISupporting.supportType as SupportType] ?? SUPPORT_META.encourage;
    const Icon = meta.icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[var(--color-success)]/50 bg-[var(--color-success-soft)]/70 p-4"
      >
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-success)] text-white">
            <Icon size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--color-text)]">
              You're supporting as "{meta.label.toLowerCase()}"
            </span>
          </div>
        </div>
        {amISupporting.pledge && (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            "{amISupporting.pledge}"
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]"
          >
            Update your support
          </button>
          <LeaveSupportButton goalId={goalId} />
        </div>

        {/* Follow-up message form */}
        <div className="mt-3 border-t border-[var(--color-success)]/30 pt-3">
          {!showFollowUp && !followUpDone && (
            <button
              onClick={() => setShowFollowUp(true)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
            >
              Post a message
            </button>
          )}
          {followUpDone && (
            <p className="text-xs font-medium text-[var(--color-success)]">
              Message posted ✓
            </p>
          )}
          {showFollowUp && (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={followUpBody}
                onChange={(e) => setFollowUpBody(e.target.value)}
                rows={3}
                placeholder="Add anything you want them to know"
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <div className="text-right text-[10px] text-[var(--color-text-dim)]">
                {followUpBody.length}/1000
              </div>
              {aiDraftControls(
                "followUp",
                amISupporting.supportType as SupportType,
                followUpBody
              )}
              {followUpErr && (
                <p className="text-xs text-[var(--color-danger)]">{followUpErr}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowFollowUp(false);
                    setFollowUpBody("");
                    setFollowUpErr(null);
                  }}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--color-border-strong)]"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!followUpBody.trim()) return;
                    setFollowUpBusy(true);
                    setFollowUpErr(null);
                    try {
                      await createMessage({
                        goalId,
                        supportType: amISupporting.supportType as SupportType,
                        body: followUpBody,
                      });
                      setFollowUpDone(true);
                      setShowFollowUp(false);
                      setFollowUpBody("");
                      if (aiUsageEventId && aiTarget === "followUp") {
                        void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "sent" });
                      }
                      setTimeout(() => setFollowUpDone(false), 2500);
                    } catch (e) {
                      setFollowUpErr(
                        e instanceof Error ? e.message : "Could not post message"
                      );
                    } finally {
                      setFollowUpBusy(false);
                    }
                  }}
                  disabled={followUpBusy || !followUpBody.trim()}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                >
                  {followUpBusy ? "Posting..." : "Post message"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (done && !open) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[var(--color-success)]/50 bg-[var(--color-success-soft)]/70 p-6 text-center"
      >
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
          <Check size={20} />
        </div>
        <h3 className="text-base font-semibold text-[var(--color-text)]">You're on the team</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
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
          className="mt-3 inline-flex min-h-8 items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]"
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
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
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
        if (aiUsageEventId && aiTarget === "message") {
          void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "sent" });
        }
      }
      trackDataFastGoal("support_joined", { support_type: supportType });
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
      className="rounded-2xl border-2 border-[var(--color-primary-soft)] bg-[var(--color-bg-card)] p-4 sm:p-5"
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
            className="grid grid-cols-2 gap-2"
          >
            <p className="col-span-2 mb-1 text-sm text-[var(--color-text-muted)]">
              How would you like to support {user?.name?.split(" ")[0] || "them"}?
            </p>
            {typesToShow.map((t, index) => {
              const meta = SUPPORT_META[t];
              const Icon = meta.icon;
              const active = supportType === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setSupportType(t);
                    setStep("compose");
                    setAiSuggestions([]);
                    setAiErr(null);
                  }}
                  className={`flex min-w-0 w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition sm:flex-row sm:gap-3 ${
                    typesToShow.length % 2 === 1 && index === typesToShow.length - 1
                      ? "col-span-2"
                      : ""
                  } ${
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg)] text-[var(--color-primary)]">
                    <Icon size={16} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-5">{meta.label}</div>
                    <div className="mt-0.5 hidden text-xs leading-5 text-[var(--color-text-muted)] min-[480px]:block">
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
              onClick={() => {
                setStep("type");
                setAiSuggestions([]);
                setAiErr(null);
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← Change support type
            </button>

            <div className="workspace-card-soft p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {(() => {
                  const Icon = SUPPORT_META[supportType].icon;
                  return <Icon size={16} className="text-[var(--color-primary)]" aria-hidden />;
                })()}
                {SUPPORT_META[supportType].label}
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
              placeholder="What do you want to say?"
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
            />
            <div className="text-right text-[10px] text-[var(--color-text-dim)]">
              {body.length}/1000
            </div>
            {aiDraftControls("message", supportType, body)}

            <div className="border-t border-[var(--color-border)] pt-3">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                Make a non-financial pledge <span className="text-[var(--color-text-dim)]">(optional)</span>
              </label>
              <input
                value={pledge}
                onChange={(e) => setPledge(e.target.value)}
                placeholder="e.g. I'll check in every Sunday"
                maxLength={200}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
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
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
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
                className="flex-1 workspace-card-soft px-4 py-2.5 text-sm font-medium transition hover:border-[var(--color-border-strong)]"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={busy}
                className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
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

function LeaveSupportButton({ goalId }: { goalId: Id<"goals"> }) {
  const leave = useMutation(api.supporters.leave);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await leave({ goalId });
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
          disabled={busy}
          className="inline-flex min-h-8 items-center rounded-full bg-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Leaving..." : "Confirm leave"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-8 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger-text)]"
    >
      Leave support
    </button>
  );
}
