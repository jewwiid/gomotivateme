"use client";

import { useAction, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AiAssistButton, AiDraftDisclosure } from "@/components/AiAssist";
import { aiAssistantErrorMessage } from "@/lib/aiAssistant";
import { trackDataFastGoal } from "@/lib/analytics";
import type { OwnerUpdateKind } from "@/components/OwnerGoalWorkspace";

const BLOCKERS = [
  { id: "time", label: "Not enough time" },
  { id: "motivation", label: "Low motivation" },
  { id: "too_big", label: "It feels too big" },
  { id: "unclear", label: "The next step is unclear" },
  { id: "outside_control", label: "Something outside my control" },
  { id: "other", label: "Something else" },
] as const;

type Blocker = (typeof BLOCKERS)[number]["id"];

type NextAction = {
  headline: string;
  action: string;
  reason: string;
  updatePrompt: string;
  usageEventId: Id<"aiUsageEvents">;
};

export function GoalMomentumCoach({
  goalId,
  fallbackAction,
  fallbackReason,
  updateKind,
  updateDisabled,
  updateLabel,
  staleDays,
  onOpenUpdate,
}: {
  goalId: Id<"goals">;
  fallbackAction: string;
  fallbackReason: string;
  updateKind: OwnerUpdateKind;
  updateDisabled?: boolean;
  updateLabel: string;
  staleDays: number;
  onOpenUpdate: (kind: OwnerUpdateKind, note?: string) => void;
}) {
  const suggestNextAction = useAction(api.aiCoach.suggestNextAction);
  const createRecoveryPlan = useAction(api.aiCoach.createRecoveryPlan);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
  const [nextBusy, setNextBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [next, setNext] = useState<NextAction | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [blocker, setBlocker] = useState<Blocker>("time");
  const [recovery, setRecovery] = useState<{
    headline: string;
    steps: string[];
    adjustment: string | null;
    encouragement: string;
    usageEventId: Id<"aiUsageEvents">;
  } | null>(null);

  const requestNextAction = async () => {
    setNextBusy(true);
    setErr(null);
    try {
      const result = await suggestNextAction({ goalId });
      setNext(result);
      trackDataFastGoal("ai_suggestion_viewed", { feature: "next_action" });
    } catch (error) {
      setErr(aiAssistantErrorMessage(error));
    } finally {
      setNextBusy(false);
    }
  };

  const openPersonalise = () => {
    setAiOpen(true);
    setErr(null);
    if (!next && !nextBusy) void requestNextAction();
  };

  const requestRecovery = async () => {
    setRecoveryBusy(true);
    setErr(null);
    try {
      const result = await createRecoveryPlan({ goalId, blocker });
      setRecovery(result);
      trackDataFastGoal("ai_suggestion_viewed", { feature: "recovery_plan" });
    } catch (error) {
      setErr(aiAssistantErrorMessage(error));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const useNextStep = (usageEventId: Id<"aiUsageEvents">, note?: string) => {
    void recordAiOutcome({ usageEventId, outcome: "applied" });
    trackDataFastGoal("ai_suggestion_applied", { feature: "next_action" });
    setAiOpen(false);
    onOpenUpdate(updateKind, note);
  };

  return (
    <section className="workspace-card p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
          <Sparkles size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--color-text)]">Next best action</p>
          <div className="mt-2">
            <p className="font-bold text-[var(--color-text)]">
              {next?.headline ?? fallbackAction}
            </p>
            {next ? (
              <>
                <p className="mt-1.5 text-sm leading-5 text-[var(--color-text)]">{next.action}</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">{next.reason}</p>
              </>
            ) : (
              <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
                {fallbackReason}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={updateDisabled}
                onClick={() =>
                  next
                    ? useNextStep(next.usageEventId, next.updatePrompt)
                    : onOpenUpdate(updateKind)
                }
                className="workspace-button-primary min-h-9 w-auto px-4 disabled:cursor-default disabled:opacity-55 active:scale-[0.98]"
              >
                {next ? "Start this step" : updateLabel}
              </button>
              <AiAssistButton
                label={next ? "Refresh with AI" : "Personalise with AI"}
                busyLabel="Finding a next step…"
                busy={nextBusy && !aiOpen}
                onClick={openPersonalise}
              />
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            {!showRecovery ? (
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] transition hover:gap-2 active:scale-[0.98]"
              >
                <RotateCcw size={13} aria-hidden />
                {staleDays >= 7 ? `Restart after ${staleDays} quiet days` : "Need a smaller restart?"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text)]">What is getting in the way?</p>
                    <p className="mt-1 text-[10px] leading-4 text-[var(--color-text-muted)]">
                      Choose one blocker so the restart stays practical.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(false);
                      setRecovery(null);
                    }}
                    className="rounded-full p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)]"
                    aria-label="Close recovery planner"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCKERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setBlocker(option.id);
                        setRecovery(null);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition active:scale-[0.98] ${
                        blocker === option.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {recovery ? (
                  <div className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-3">
                    <p className="text-xs font-bold text-[var(--color-text)]">{recovery.headline}</p>
                    <ol className="mt-2 space-y-1.5">
                      {recovery.steps.map((step, index) => (
                        <li key={step} className="flex gap-2 text-xs leading-5 text-[var(--color-text)]">
                          <span className="font-mono text-[var(--color-primary)]">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {recovery.adjustment ? (
                      <p className="mt-2 text-[10px] leading-4 text-[var(--color-text-muted)]">
                        Optional adjustment: {recovery.adjustment}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{recovery.encouragement}</p>
                    <button
                      type="button"
                      onClick={() => useNextStep(recovery.usageEventId, recovery.steps[0])}
                      className="workspace-button-primary mt-3 min-h-9 w-auto px-4 active:scale-[0.98]"
                    >
                      Take the first step
                    </button>
                    <AiDraftDisclosure />
                  </div>
                ) : (
                  <AiAssistButton
                    label="Build my restart plan"
                    busyLabel="Building a smaller plan…"
                    busy={recoveryBusy}
                    onClick={() => void requestRecovery()}
                  />
                )}
              </div>
            )}
          </div>
          {err && !aiOpen ? <p className="mt-3 text-xs text-[var(--color-danger-text)]">{err}</p> : null}
        </div>
      </div>

      <NextActionModal
        open={aiOpen}
        busy={nextBusy}
        error={err}
        next={next}
        updateDisabled={updateDisabled}
        onClose={() => setAiOpen(false)}
        onRetry={() => void requestNextAction()}
        onStart={() => next && useNextStep(next.usageEventId, next.updatePrompt)}
      />
    </section>
  );
}

function NextActionModal({
  open,
  busy,
  error,
  next,
  updateDisabled,
  onClose,
  onRetry,
  onStart,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  next: NextAction | null;
  updateDisabled?: boolean;
  onClose: () => void;
  onRetry: () => void;
  onStart: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="next-action-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="next-action-title"
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="workspace-card max-h-[90dvh] w-full max-w-md overflow-y-auto p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-medium tracking-[0.04em] text-[var(--color-primary)]">
                  Next best action
                </p>
                <h3 id="next-action-title" className="mt-1 text-lg font-semibold">
                  Personalise this step
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {busy && !next ? (
              <div className="grid min-h-40 place-items-center text-center text-[var(--color-text-muted)]">
                <Loader2 className="mx-auto animate-spin text-[var(--color-primary)]" size={28} />
                <p className="mt-3 text-sm">Finding a next step for this goal…</p>
              </div>
            ) : next ? (
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.035em]">{next.headline}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text)]">{next.action}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{next.reason}</p>
                <p className="mt-4 border-l-2 border-[var(--color-primary)]/35 pl-3 text-xs font-semibold leading-5 text-[var(--color-text)]">
                  When you finish: {next.updatePrompt}
                </p>
                <AiDraftDisclosure />
                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    disabled={updateDisabled}
                    onClick={onStart}
                    className="workspace-button-primary min-h-11 w-full disabled:cursor-default disabled:opacity-55"
                  >
                    Start this step
                  </button>
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={busy}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--color-border-strong)] text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] disabled:opacity-50"
                  >
                    {busy ? "Refreshing…" : "Try another suggestion"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  {error ?? "We could not personalise this step. Try again."}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={busy}
                  className="workspace-button-primary min-h-11 w-full"
                >
                  {busy ? "Trying again…" : "Try again"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
