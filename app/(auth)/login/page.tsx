"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  MIN_PASSWORD_LENGTH,
  translateAuthError,
  validatePasswordClient,
} from "@/lib/authErrors";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
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

  // `signIn` has received and stored the token once it resolves, but Convex
  // still needs a moment to validate that token on its live connection. Going
  // to the dashboard sooner makes RequireAuth see a transient signed-out
  // state and send the user straight back here.
  useEffect(() => {
    if (awaitingSession && isAuthenticated) {
      router.replace(redirect || "/dashboard");
    }
  }, [awaitingSession, isAuthenticated, router, redirect]);

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
    let waitingForSession = false;
    try {
      const result = await signIn("password", {
        email,
        password,
        flow: "signIn",
      });
      if (!result.signingIn) {
        throw new Error("Sign-in did not create a session");
      }
      waitingForSession = true;
      setAwaitingSession(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[login] auth error:", e);
      setErr(translateAuthError(e, "signIn"));
    } finally {
      if (!waitingForSession) setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="brand-kicker">Keep your momentum</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Welcome back</h1>
      <p className="mb-8 mt-3 text-base leading-7 text-[#686963]">
        Sign in to keep your momentum going.
      </p>

      <GoogleSignInButton mode="signIn" redirectTo={redirect || "/dashboard"} />

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
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
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
          <div className="mt-1 text-right">
            <Link
              href="/reset"
              className="text-[11px] text-[var(--color-text-dim)] transition hover:text-[var(--color-primary)]"
            >
              Forgot password?
            </Link>
          </div>
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
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#686963]">
        New here?{" "}
        <Link
          href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"}
          className="font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
        >
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}
