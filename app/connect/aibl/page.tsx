"use client";

import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { BrandName } from "@/components/Wordmark";
import { AiblWordmark } from "@/components/AiblMark";

function ConnectAiblContent() {
  const params = useSearchParams();
  const router = useRouter();
  const createCode = useMutation(api.partner.createAuthorizationCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";
  const clientId = params.get("client_id") || "";

  const valid = useMemo(() => {
    if (clientId && clientId !== "aibl") return false;
    if (!redirectUri || !state) return false;
    try {
      const url = new URL(redirectUri);
      return url.pathname === "/connect/gmm";
    } catch {
      return false;
    }
  }, [clientId, redirectUri, state]);

  const approve = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const { code } = await createCode({ redirectUri, state });
      const next = new URL(redirectUri);
      next.searchParams.set("gmm_code", code);
      next.searchParams.set("state", state);
      window.location.assign(next.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect AI Boss Leader");
      setBusy(false);
    }
  };

  const deny = () => {
    if (valid) {
      const next = new URL(redirectUri);
      next.searchParams.set("error", "access_denied");
      next.searchParams.set("state", state);
      window.location.assign(next.toString());
      return;
    }
    router.push("/settings");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="brand-kicker">Connected apps</p>
        <div className="mt-3">
          <AiblWordmark className="text-2xl" />
        </div>
        <h1 className="mt-2 title-page">Connect AI Boss Leader</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          <BrandName /> will let AI Boss Leader create a goal from a campaign, post
          progress when you finish tasks, and mark the goal complete when the
          campaign is done. AI Boss Leader is invite-only. Only someone who already
          has AIBL access can start this connect from AIBL Profile.
        </p>

        {!valid ? (
          <div className="workspace-card mt-8 p-5 text-sm text-[var(--color-danger-text)]">
            This connect link is missing or invalid. Open AI Boss Leader and choose
            Connect GoMotivateMe again.
          </div>
        ) : (
          <div className="workspace-card mt-8 space-y-4 p-5">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Returning to{" "}
              <span className="font-medium text-[var(--color-text)]">
                {(() => {
                  try {
                    return new URL(redirectUri).origin;
                  } catch {
                    return "AI Boss Leader";
                  }
                })()}
              </span>
            </p>
            {error && (
              <div className="rounded-lg border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger-text)]">
                {error}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void approve()}
                disabled={busy}
                className="workspace-button-primary w-auto px-5"
              >
                {busy ? "Connecting…" : "Allow AI Boss Leader"}
              </button>
              <button
                type="button"
                onClick={deny}
                disabled={busy}
                className="rounded-xl border border-[var(--color-border)] px-5 py-2 text-sm font-semibold text-[var(--color-text-muted)]"
              >
                Not now
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ConnectAiblPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
        <ConnectAiblContent />
      </Suspense>
    </RequireAuth>
  );
}
