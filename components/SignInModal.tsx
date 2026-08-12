"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function SignInModal({
  open,
  onClose,
  redirectPath,
}: {
  open: boolean;
  onClose: () => void;
  redirectPath: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const redirect = encodeURIComponent(redirectPath || "/");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(17,28,24,0.72)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-sign-in-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-2xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close sign in dialog"
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--color-text-muted)] shadow-sm transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <X size={18} aria-hidden />
            </button>

            <div className="relative h-44 overflow-hidden bg-[var(--color-gold-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/illustrations/journey/support.webp"
                alt=""
                aria-hidden
                className="h-full w-full object-cover object-[50%_62%] mix-blend-multiply"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
            </div>

            <div className="px-6 pb-7 text-center sm:px-8">
              <span className="mx-auto -mt-5 grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary)] text-white shadow-md">
                <Heart size={18} fill="currentColor" aria-hidden />
              </span>
              <h2
                id="support-sign-in-title"
                className="mt-4 font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--color-text)]"
              >
                Show up as yourself.
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
                Sign in so your support is personal, accountable, and connected to your profile.
              </p>

              <Link
                href={`/login?redirect=${redirect}`}
                className="workspace-button-primary mt-6 w-full"
              >
                Sign in to support
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href={`/signup?redirect=${redirect}`}
                className="workspace-button-secondary mt-2 w-full"
              >
                Create an account
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 min-h-10 px-4 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
              >
                Keep browsing
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
