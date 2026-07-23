"use client";

import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";

/**
 * "Continue with Google" button — triggers the @convex-dev/auth Google
 * OAuth flow. The library handles the redirect to Google, the callback
 * at /api/auth/callback/google, token storage, and the redirect back
 * to the app.
 *
 * We watch `isAuthenticated` after the user returns from Google so we
 * can navigate to /dashboard the moment the Convex client has
 * validated the new token (the same trick we use for password signin
 * in login/page.tsx — without it, RequireAuth sees a transient
 * signed-out state and bounces back to /login).
 */
export function GoogleSignInButton({ mode, redirectTo = "/dashboard" }: { mode: "signIn" | "signUp"; redirectTo?: string }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [awaitingSession, setAwaitingSession] = useState(false);

  useEffect(() => {
    if (awaitingSession && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [awaitingSession, isAuthenticated, router, redirectTo]);

  const onClick = async () => {
    setErr(null);
    setBusy(true);
    try {
      const result = await signIn("google", { redirectTo });
      if (!result.redirect) {
        // No redirect happened (rare on web — usually the browser has
        // already navigated away by this point). Treat as "session
        // will land shortly" and watch for isAuthenticated.
        setAwaitingSession(true);
      }
      // If result.redirect is set, the browser is being redirected to
      // Google; we won't reach the line below.
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[${mode}] google auth error:`, e);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg.toLowerCase().includes("popup")
          ? "Popup blocked — allow popups for this site and try again."
          : "Couldn't sign you in with Google. Please try again."
      );
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#deddd6] bg-white py-3 text-sm font-semibold text-[#292929] transition hover:bg-[#f7f6ef] disabled:opacity-50"
      >
        <GoogleLogo />
        {busy
          ? "Opening Google…"
          : mode === "signUp"
            ? "Sign up with Google"
            : "Continue with Google"}
      </button>
      {err && (
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
          {err}
        </div>
      )}
    </div>
  );
}

/** Inline Google "G" logo — kept in this file so we don't depend on a third-party icon. */
function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      width={18}
      height={18}
      className="shrink-0"
    >
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-11.3 8 12 12 0 0 1 0-24 11.9 11.9 0 0 1 8.4 3.1l5.7-5.7A20 20 0 1 0 44 24a20.2 20.2 0 0 0-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12a11.9 11.9 0 0 1 8.4 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28.9l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3C41 35 44 30 44 24a20.2 20.2 0 0 0-.4-3.5z" />
    </svg>
  );
}
