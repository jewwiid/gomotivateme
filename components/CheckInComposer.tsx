"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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
  const [type, setType] = useState<string>("encouragement");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await createCheckIn({ pledgeId, type, body });
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
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
              onClick={() => setType(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                type === t.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[#f0efe9] text-[#686963] hover:bg-[#e8e7e0]"
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
        className="w-full resize-none rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#888983]">{body.length}/1000</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="text-xs text-[#888983] transition hover:text-[#292929]"
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
      {err && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <X size={12} />
          {err}
        </div>
      )}
    </form>
  );
}
