"use client";

import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { trackDataFastGoal } from "@/lib/analytics";
import { AiAssistButton, AiSuggestionPicker } from "@/components/AiAssist";
import { aiAssistantErrorMessage } from "@/lib/aiAssistant";

const CHECK_IN_TYPES = [
  { id: "encouragement", label: "Encouragement", hint: "Cheer them on" },
  { id: "accountability", label: "Accountability", hint: "Did they do it?" },
  { id: "advice", label: "Advice", hint: "Share guidance" },
  { id: "reflection", label: "Reflection", hint: "How's it going?" },
  { id: "milestone", label: "Milestone", hint: "Mark progress" },
] as const;

/**
 * Inline check-in composer for motivators. Expand-in-place state machine
 * modeled on StructuredSupportComposer. Called from the motivate page.
 */
export function CheckInComposer({
  pledgeId,
  onDone,
}: {
  pledgeId: Id<"motivatorPledges">;
  onDone?: () => void;
}) {
  const createCheckIn = useMutation(api.motivation.createCheckIn);
  const draftCheckIn = useAction(api.aiCoach.draftCheckIn);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
  const [type, setType] = useState<string>("encouragement");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ text: string; angle: string }>>([]);
  const [aiRationale, setAiRationale] = useState("");
  const [aiUsageEventId, setAiUsageEventId] = useState<Id<"aiUsageEvents"> | null>(null);

  const requestAiDraft = async () => {
    setAiBusy(true);
    setAiErr(null);
    setAiSuggestions([]);
    try {
      const result = await draftCheckIn({
        pledgeId,
        type,
        draftText: body.trim() || undefined,
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await createCheckIn({ pledgeId, type, body });
      if (aiUsageEventId) {
        void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "sent" });
      }
      trackDataFastGoal("checkin_sent", { checkin_type: type });
      setDone(true);
      setTimeout(() => onDone?.(), 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send check-in");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-success-soft)] bg-[var(--color-success-soft)] px-4 py-3 text-sm text-[var(--color-success-text)]">
        <Check size={16} />
        Check-in sent
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHECK_IN_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id);
                setAiSuggestions([]);
                setAiErr(null);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                type === t.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          CHECK_IN_TYPES.find((t) => t.id === type)?.hint ?? "Write your check-in..."
        }
        rows={3}
        maxLength={1000}
        className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-text-dim)]">{body.length}/1000</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="text-xs text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || body.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null}
            {busy ? "Sending..." : "Send check-in"}
          </button>
        </div>
      </div>
      <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
        <AiAssistButton
          label={body.trim() ? "Improve with AI" : "Help me write this"}
          busyLabel="Drafting options…"
          busy={aiBusy}
          onClick={() => void requestAiDraft()}
        />
        {aiErr ? <p className="text-xs text-[var(--color-danger-text)]">{aiErr}</p> : null}
        {aiSuggestions.length > 0 ? (
          <AiSuggestionPicker
            suggestions={aiSuggestions}
            rationale={aiRationale}
            onSelect={(text) => {
              setBody(text);
              if (aiUsageEventId) {
                void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "applied" });
              }
              trackDataFastGoal("ai_suggestion_applied", { feature: "checkin_draft" });
              setAiSuggestions([]);
            }}
            onDismiss={() => {
              if (aiUsageEventId) {
                void recordAiOutcome({ usageEventId: aiUsageEventId, outcome: "dismissed" });
              }
              setAiSuggestions([]);
            }}
          />
        ) : null}
      </div>
      {err && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger-text)]">
          <X size={12} />
          {err}
        </div>
      )}
    </form>
  );
}
