import type { ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

export function AiAssistButton({
  label,
  busyLabel = "Thinking…",
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busyLabel?: string;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-primary)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" aria-hidden />
      ) : (
        <Sparkles size={15} aria-hidden />
      )}
      {busy ? busyLabel : label}
    </button>
  );
}

export function AiDraftCard({
  children,
  rationale,
  onApply,
  onDismiss,
  applyLabel = "Use this draft",
}: {
  children: ReactNode;
  rationale: string;
  onApply: () => void;
  onDismiss: () => void;
  applyLabel?: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
          <Sparkles size={14} aria-hidden />
          AI draft
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-[var(--color-text-muted)] transition hover:bg-white hover:text-[var(--color-text)]"
          aria-label="Dismiss AI draft"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="mt-3 text-sm leading-6 text-[var(--color-text)]">{children}</div>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">{rationale}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          {applyLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}

export function AiDraftDisclosure() {
  return (
    <p className="mt-2 text-xs leading-5 text-[var(--color-text-dim)]">
      AI suggestions are optional drafts. Nothing changes until you apply one.
    </p>
  );
}
