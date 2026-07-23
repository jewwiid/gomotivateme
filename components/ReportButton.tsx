"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useVisitorKey } from "@/lib/useVisitorKey";

const reasons = [
  ["sexual", "Sexual content"],
  ["violence", "Violence or graphic imagery"],
  ["harassment", "Harassment or threats"],
  ["hate", "Hate or discrimination"],
  ["self_harm", "Self-harm content"],
  ["spam", "Spam or scam"],
  ["other", "Something else"],
] as const;

export function ReportButton({
  goalId,
  updateId,
  className,
}: {
  goalId: Id<"goals">;
  updateId?: Id<"updates">;
  className?: string;
}) {
  const visitorKey = useVisitorKey();
  const submit = useMutation(api.reports.submit);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("other");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!visitorKey) return;
    setBusy(true);
    try {
      const result = await submit({
        goalId,
        updateId,
        reporterKey: visitorKey,
        reason,
        details: details || undefined,
      });
      setMessage(result.submitted ? "Thanks. Your report has been sent for review." : "You have already reported this item.");
    } catch {
      setMessage("We could not send that report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!visitorKey}
        className={className ?? "inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-zinc-800 disabled:opacity-50"}
      >
        <Flag size={12} />
        Report {updateId ? "update" : "goal"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <form
            onSubmit={onSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Report {updateId ? "this update" : "this goal"}</h3>
                <p className="mt-1 text-sm text-zinc-500">Reports are reviewed by the GoMotivateMe team.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100" aria-label="Close report form">
                <X size={16} />
              </button>
            </div>

            {message ? (
              <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                {message}
                <button type="button" onClick={() => setOpen(false)} className="mt-3 block font-semibold text-[var(--color-primary)]">Close</button>
              </div>
            ) : (
              <>
                <label className="mt-5 block text-sm font-medium text-zinc-800">What is the issue?</label>
                <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-800 focus:border-[var(--color-primary)] focus:outline-none">
                  {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label className="mt-4 block text-sm font-medium text-zinc-800">Details <span className="font-normal text-zinc-400">(optional)</span></label>
                <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-800 focus:border-[var(--color-primary)] focus:outline-none" />
                <button type="submit" disabled={busy || !visitorKey} className="mt-5 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50">
                  {busy ? "Sending report..." : "Send report"}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
