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

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    // Pre-flight: don't hit the server for known-bad inputs. Saves a
    // round-trip and avoids the generic "Server Error" the Convex HTTP
    // client shows when the server rejects the request.
    const pwErr = validatePasswordClient(password);
    if (pwErr) {
      setErr(pwErr);
      return;
    }
    if (!email.trim()) {
      setErr("Enter your email");
      return;
    }

    setBusy(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/dashboard");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[login] auth error:", e);
      setErr(translateAuthError(e, "signIn"));
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
        Sign in to keep your momentum going.
      </p>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
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
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="••••••••"
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
