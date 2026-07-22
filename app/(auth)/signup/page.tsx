"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
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

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const setHandle = useMutation(api.users.setHandle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandleInput] = useState("");
  const handleDirtyRef = useRef(false);
  const [busy, setBusy] = useState(false);
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
    try {
      await signIn("password", {
        email,
        password,
        name,
        flow: "signUp",
      });
      // Navigate IMMEDIATELY so the user lands on the dashboard. The
      // auth token is still propagating client-side, and the inline
      // `setHandle` mutation was racing it (Convex logs were full of
      // "Not signed in" right after signIn). Defer the handle set to
      // a microtask so the auth context has time to land. If the
      // handle is missing on the user record, they can set it in
      // settings on next visit — nothing breaks.
      if (handle.trim()) {
        const desiredHandle = handle.trim();
        queueMicrotask(() => {
          setHandle({ handle: desiredHandle }).catch(() => {
            // Soft-fail: queue the warning for the dashboard, never
            // block the signup flow.
            try {
              sessionStorage.setItem(
                "signup-handle-warning",
                "We saved your account but couldn't set the handle — pick one in settings."
              );
            } catch {
              // sessionStorage might be unavailable
            }
          });
        });
      }
      router.push("/dashboard");
    } catch (e) {
      // Log the raw error in the console so we can debug future
      // translation gaps. The Convex HTTP client occasionally hides
      // the real message behind a "Server Error" wrapper, so knowing
      // the actual `.message` / `.data` shape is gold.
      // eslint-disable-next-line no-console
      console.warn("[signup] auth error:", e);
      setErr(translateAuthError(e, "signUp"));
    } finally {
      setBusy(false);
    }
  };

  const handleValid = handle.trim().length > 0 && !handleErr;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
        Start your momentum
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
            Handle <span className="text-[var(--color-text-dim)]">(optional)</span>
          </label>
          <div
            className={`flex items-center rounded-lg border bg-[var(--color-bg-elev)] pr-3 transition ${
              handleErr
                ? "border-[var(--color-danger)]/50"
                : handleValid
                ? "border-emerald-500/40"
                : "border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)]"
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
                  gomotivateme.com/u/
                  {handle.trim() || suggestHandle(name) || "your-handle"}
                </span>
              </>
            )}
          </div>
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
