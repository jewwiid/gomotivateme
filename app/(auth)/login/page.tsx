"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in");
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
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Sign in to keep your odyssey going.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
        >
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}
