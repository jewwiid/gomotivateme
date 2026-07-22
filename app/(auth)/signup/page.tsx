"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, AtSign, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  MIN_PASSWORD_LENGTH,
  translateAuthError,
  validatePasswordClient,
} from "@/lib/authErrors";
import {
  MAX_HANDLE_LENGTH,
  suggestHandle,
  validateHandleClient,
} from "@/lib/handle";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const setHandle = useMutation(api.users.setHandle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandleInput] = useState("");
  const handleDirtyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [handleErr, setHandleErr] = useState<string | null>(null);
  const [passwordHint, setPasswordHint] = useState<
    null | "ok" | "short"
  >(null);

  // Auto-suggest handle from the name until the user touches the handle
  // field. Once they've edited it, the suggestion is frozen so we don't
  // keep overwriting their choice.
  useEffect(() => {
    if (!handleDirtyRef.current) {
      setHandleInput(suggestHandle(name));
    }
  }, [name]);

  // Wait until Convex has validated the fresh token before either making the
  // authenticated handle mutation or moving to the guarded dashboard route.
  // `signIn` itself only guarantees that the token was received and stored.
  useEffect(() => {
    if (!awaitingSession || !isAuthenticated) return;

    let active = true;
    const finishSignup = async () => {
      const desiredHandle = handle.trim();
      if (desiredHandle) {
        try {
          await setHandle({ handle: desiredHandle });
        } catch {
          // The account itself is ready. Preserve the warning for settings
          // rather than blocking the user on a cosmetic profile field.
          try {
            sessionStorage.setItem(
              "signup-handle-warning",
              "We saved your account but couldn't set the handle — pick one in settings."
            );
          } catch {
            // sessionStorage might be unavailable
          }
        }
      }
      if (active) router.replace("/dashboard");
    };

    void finishSignup();
    return () => {
      active = false;
    };
  }, [awaitingSession, handle, isAuthenticated, router, setHandle]);

  const onPasswordChange = (v: string) => {
    setPassword(v);
    if (v.length === 0) setPasswordHint(null);
    else if (v.length < MIN_PASSWORD_LENGTH) setPasswordHint("short");
    else setPasswordHint("ok");
  };

  const onHandleChange = (v: string) => {
    handleDirtyRef.current = true;
    const lower = v.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setHandleInput(lower.slice(0, MAX_HANDLE_LENGTH));
    setHandleErr(validateHandleClient(lower));
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
    // Handle is OPTIONAL. Only validate + persist if they typed one.
    if (handle.trim()) {
      const v = validateHandleClient(handle);
      if (v) {
        setHandleErr(v);
        setErr("Fix your handle to continue");
        return;
      }
    }

    setBusy(true);
    let waitingForSession = false;
    try {
      const result = await signIn("password", {
        email,
        password,
        name,
        flow: "signUp",
      });
      if (!result.signingIn) {
        throw new Error("Sign-up did not create a session");
      }
      waitingForSession = true;
      setAwaitingSession(true);
    } catch (e) {
      // Log the raw error in the console so we can debug future
      // translation gaps. The Convex HTTP client occasionally hides
      // the real message behind a "Server Error" wrapper, so knowing
      // the actual `.message` / `.data` shape is gold.
      // eslint-disable-next-line no-console
      console.warn("[signup] auth error:", e);
      setErr(translateAuthError(e, "signUp"));
    } finally {
      if (!waitingForSession) setBusy(false);
    }
  };

  const handleValid = handle.trim().length > 0 && !handleErr;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="brand-kicker">A goal is better with company</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
        Start your momentum
      </h1>
      <p className="mb-8 mt-3 text-base leading-7 text-[#686963]">
        Set up an account in 30 seconds.
      </p>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
            Handle <span className="text-[var(--color-text-dim)]">(optional)</span>
          </label>
          <div
            className={`flex items-center rounded-xl border bg-white pr-3 transition ${
              handleErr
                ? "border-[var(--color-danger)]/50"
                : handleValid
                ? "border-emerald-500/40"
                : "border-[#c9c8c0] focus-within:border-[var(--color-primary)]"
            }`}
          >
            <span className="ml-3 select-none text-sm text-[var(--color-text-dim)]">
              <AtSign size={14} className="inline -translate-y-px" />
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              className="w-full bg-transparent px-2 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
              placeholder="your-handle"
            />
            {handleValid && (
              <Check size={14} className="text-emerald-400" />
            )}
            {handleErr && (
              <X size={14} className="text-[var(--color-danger)]" />
            )}
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-text-dim)]">
            {handleErr ?? (
              <>
                Your profile lives at{" "}
                <span className="font-mono text-[var(--color-text-muted)]">
                  gomotivateme.com/@
                  {handle.trim() || suggestHandle(name) || "your-handle"}
                </span>
              </>
            )}
          </div>
        </div>

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
            autoComplete="new-password"
            className="w-full rounded-xl border border-[#c9c8c0] bg-white px-4 py-3 text-sm text-[#292929] placeholder:text-[#888983] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
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
          className="mt-2 w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#888983]">
        <span className="h-px flex-1 bg-[#deddd6]" />
        or
        <span className="h-px flex-1 bg-[#deddd6]" />
      </div>

      <GoogleSignInButton mode="signUp" />

      <p className="mt-7 text-center text-sm text-[#686963]">
        Already have an account?{" "}
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
