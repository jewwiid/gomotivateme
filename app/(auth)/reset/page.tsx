"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { translateAuthError } from "@/lib/authErrors";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function ResetRequestPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) {
      setErr("Enter your email");
      return;
    }
    setBusy(true);
    try {
      await signIn("password", { email, flow: "reset" });
      setSent(true);
    } catch (e) {
      setErr(translateAuthError(e, "signIn"));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <CheckCircle2 size={48} className="mx-auto text-[var(--color-success-text)]" />
        <h1 className="mt-6 title-state">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          If an account exists for {email}, we&apos;ve sent a link to reset your
          password.
        </p>
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          <Link
            href="/login"
            className="font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
          >
            Back to sign in
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="brand-kicker">Forgot your password?</p>
      <h1 className="mt-3 title-page">
        Reset it
      </h1>
      <p className="mb-8 mt-3 text-base leading-7 text-[var(--color-text-muted)]">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>

      <GoogleSignInButton mode="signIn" />

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
        <span className="h-px flex-1 bg-[var(--color-bg-sunken)]" />
        or
        <span className="h-px flex-1 bg-[var(--color-bg-sunken)]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="workspace-input px-4 py-3"
            placeholder="you@example.com"
          />
        </div>

        {err && (
          <div className="rounded-[var(--workspace-radius)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger-text)]">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="workspace-button-primary mt-2 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-text-muted)]">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
