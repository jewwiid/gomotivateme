"use client";

import { useAction, useMutation } from "convex/react";
import { RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";
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
  onOpenUpdate: (kind: OwnerUpdateKind) => void;
}) {
  const suggestNextAction = useAction(api.aiCoach.suggestNextAction);
  const createRecoveryPlan = useAction(api.aiCoach.createRecoveryPlan);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
  const [nextBusy, setNextBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [next, setNext] = useState<{
    headline: string;
    action: string;
    reason: string;
    updatePrompt: string;
    usageEventId: Id<"aiUsageEvents">;
  } | null>(null);
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

  const useNextStep = (usageEventId: Id<"aiUsageEvents">) => {
    void recordAiOutcome({ usageEventId, outcome: "applied" });
    trackDataFastGoal("ai_suggestion_applied", { feature: "next_action" });
    onOpenUpdate(updateKind);
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
                <p className="mt-2 border-l-2 border-[var(--color-primary)]/35 pl-2 text-[10px] leading-4 text-[var(--color-text-muted)]">
                  When you finish: {next.updatePrompt}
                </p>
                <AiDraftDisclosure />
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
                onClick={() => (next ? useNextStep(next.usageEventId) : onOpenUpdate(updateKind))}
                className="workspace-button-primary min-h-9 w-auto px-4 disabled:cursor-default disabled:opacity-55 active:scale-[0.98]"
              >
                {next ? "Start this step" : updateLabel}
              </button>
              {next ? (
                <button
                  type="button"
                  onClick={() => {
                    void recordAiOutcome({ usageEventId: next.usageEventId, outcome: "dismissed" });
                    setNext(null);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] active:scale-[0.98]"
                  aria-label="Dismiss AI next action"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : (
                <AiAssistButton
                  label="Personalise with AI"
                  busyLabel="Finding a next step…"
                  busy={nextBusy}
                  onClick={() => void requestNextAction()}
                />
              )}
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
                      onClick={() => useNextStep(recovery.usageEventId)}
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
          {err ? <p className="mt-3 text-xs text-[var(--color-danger-text)]">{err}</p> : null}
        </div>
      </div>
    </section>
  );
}
