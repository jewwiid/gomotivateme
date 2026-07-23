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
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-[#292929]">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#686963]">
          If an account exists for {email}, we&apos;ve sent a link to reset your
          password.
        </p>
        <p className="mt-6 text-sm text-[#686963]">
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
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
        Reset it
      </h1>
      <p className="mb-8 mt-3 text-base leading-7 text-[#686963]">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>

      <GoogleSignInButton mode="signIn" />

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#888983]">
        <span className="h-px flex-1 bg-[#deddd6]" />
        or
        <span className="h-px flex-1 bg-[#deddd6]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            placeholder="you@example.com"
          />
        </div>

        {err && (
          <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#686963]">
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
