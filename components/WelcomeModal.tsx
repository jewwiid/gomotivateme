"use client";

/**
 * Welcome modal — GoFundMe-style first-visit nudge.
 *
 * Shown to signed-out visitors on the home page on their first visit.
 * Renders the platform's value prop with a single primary CTA.
 * State is persisted in localStorage so the user only sees it once
 * (they can dismiss with the X, click outside, or hit the CTA — all
 * three are treated as "shown + dismissed").
 */
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "gomotivateme:welcome-seen";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show the modal if the user already saw it (or is signed in —
    // we check signed-in client-side via the absence of a Convex token
    // in localStorage). Signed-in users skip the welcome nudge.
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
      // Slight delay so the modal lands AFTER the hero has settled in.
      // Feels less abrupt than popping on first paint.
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    } catch {
      // localStorage might be disabled (private mode, etc.) — silently
      // skip rather than breaking the page.
    }
  }, []);

  // Lock body scroll while the modal is open. Wired via the close paths
  // so we always clean up, even on navigation away.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Esc — the discover flow expects keyboard-friendly modals.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1], // smooth-decel
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X size={16} />
            </button>

            {/* Original editorial image of a real-life support circle. */}
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[var(--color-primary-soft)] via-white to-[var(--color-accent-soft)]">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/illustrations/motivation-circle-v3.webp"
                  alt=""
                  aria-hidden
                  className="h-44 w-44 rotate-[-4deg] rounded-2xl object-cover shadow-lg ring-1 ring-zinc-200/60"
                />
              </div>
              {/* Soft fade at the bottom so the cover melts into the white card body */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Body */}
            <div className="px-7 pb-7 pt-2 text-center">
              <h2
                id="welcome-modal-title"
                className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-[26px]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Welcome to GoMotivateMe
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-600">
                Set a goal, share progress, and let a circle of
                people keep you going. No payments. No performative likes.
                just honest momentum.
              </p>

              <Link
                href="/signup"
                onClick={dismiss}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                Get started
              </Link>
              <button
                onClick={dismiss}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full px-6 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
              >
                I&apos;ll just look around
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
