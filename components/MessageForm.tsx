"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { Check, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useVisitorKey } from "@/lib/useVisitorKey";

export function MessageForm({ goalId }: { goalId: Id<"goals"> }) {
  const visitorKey = useVisitorKey();
  const leaveMessage = useMutation(api.reactions.leaveMessage);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorKey) return;
    setBusy(true);
    setErr(null);
    try {
      await leaveMessage({
        goalId,
        visitorKey,
        displayName: name || undefined,
        message,
      });
      setSent(true);
      setMessage("");
      setName("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1600);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border-strong)] px-4 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
          >
            <MessageCircle size={14} />
            Leave a message
          </motion.button>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmit}
            className="space-y-3"
          >
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <textarea
              placeholder="Words of encouragement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={500}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-dim)]">
                {message.length}/500
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !message.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
                >
                  {sent ? <Check size={14} /> : <Send size={14} />}
                  {sent ? "Sent!" : busy ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
            {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}
            {sent && (
              <p className="text-xs text-[var(--color-success)]">
                Got it. The owner will see this and can choose to display it.
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
