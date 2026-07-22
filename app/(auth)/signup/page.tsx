"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  MIN_PASSWORD_LENGTH,
  translateAuthError,
  validatePasswordClient,
} from "@/lib/authErrors";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [passwordHint, setPasswordHint] = useState<
    null | "ok" | "short"
  >(null);

  const onPasswordChange = (v: string) => {
    setPassword(v);
    if (v.length === 0) setPasswordHint(null);
    else if (v.length < MIN_PASSWORD_LENGTH) setPasswordHint("short");
    else setPasswordHint("ok");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const pwErr = validatePasswordClient(password);
    if (pwErr) {
      setErr(pwErr);
      return;
    }
    if (!email.trim()) {
      setErr("Enter your email");
      return;
    }
    if (!name.trim()) {
      setErr("Enter your name");
      return;
    }

    setBusy(true);
    try {
      await signIn("password", {
        email,
        password,
        name,
        flow: "signUp",
      });
      router.push("/dashboard");
    } catch (e) {
      setErr(translateAuthError(e, "signUp"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
        Start your odyssey
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Set up an account in 30 seconds.
      </p>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="At least 8 characters"
          />
          {passwordHint === "short" && (
            <div className="mt-1 text-[10px] text-[var(--color-text-dim)]">
              {MIN_PASSWORD_LENGTH} characters minimum
            </div>
          )}
          {passwordHint === "ok" && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <Check size={10} />
              Looks good
            </div>
          )}
        </div>

        {err && (
          <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
