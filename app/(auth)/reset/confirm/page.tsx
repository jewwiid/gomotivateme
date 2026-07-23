"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordClient,
} from "@/lib/authErrors";

function ResetConfirmContent() {
  const params = useSearchParams();
  const code = params.get("code");
  const email = params.get("email");
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!code || !email) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-[#292929]">
          Invalid link
        </h1>
        <p className="mt-3 text-sm text-[#686963]">
          This reset link is incomplete or expired.
        </p>
        <p className="mt-6">
          <Link
            href="/reset"
            className="font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
          >
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const pwErr = validatePasswordClient(password);
    if (pwErr) {
      setErr(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await signIn("password", {
        email,
        code,
        newPassword: password,
        flow: "reset-verification",
      });
      setDone(true);
      // Brief delay so the user sees the success state, then go to login.
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Couldn't reset password. The link may be expired."
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <Check
          size={48}
          className="mx-auto text-emerald-500"
        />
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-[#292929]">
          Password reset
        </h1>
        <p className="mt-3 text-sm text-[#686963]">
          Your password has been updated. Taking you to sign in…
        </p>
        <Loader2 size={16} className="mx-auto mt-4 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="brand-kicker">Almost there</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
        New password
      </h1>
      <p className="mb-8 mt-3 text-base leading-7 text-[#686963]">
        Choose a new password for your account.
      </p>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            New password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            Confirm password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            placeholder="Type your password again"
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
          {busy ? "Resetting..." : "Set new password"}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-[#686963]">Loading…</div>}>
      <ResetConfirmContent />
    </Suspense>
  );
}
