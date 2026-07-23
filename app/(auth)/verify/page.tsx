"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyContent() {
  const params = useSearchParams();
  const code = params.get("code");
  const email = params.get("email");
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !email) {
      setStatus("error");
      setErr("This verification link is incomplete.");
      return;
    }
    let active = true;
    (async () => {
      try {
        await signIn("password", { email, code, flow: "email-verification" });
        if (active) setStatus("success");
      } catch (e) {
        if (!active) return;
        setStatus("error");
        setErr(e instanceof Error ? e.message : "Verification failed.");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, email]);

  // On success, wait for session then go to dashboard.
  useEffect(() => {
    if (status === "success" && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [status, isAuthenticated, router]);

  if (status === "loading") {
    return <Result icon="loading" title="Verifying your email…" body="" />;
  }
  if (status === "error") {
    return (
      <Result
        icon="alert"
        title="Couldn't verify"
        body={err ?? "The link may be expired or invalid."}
      />
    );
  }
  return (
    <Result
      icon="check"
      title="Email verified"
      body="Taking you to your dashboard…"
    />
  );
}

function Result({
  icon,
  title,
  body,
}: {
  icon: "check" | "alert" | "loading";
  title: string;
  body: string;
}) {
  const Icon =
    icon === "check" ? CheckCircle2 : icon === "alert" ? AlertCircle : Loader2;
  return (
    <div className="text-center">
      <Icon
        size={48}
        className={
          icon === "check"
            ? "mx-auto text-emerald-500"
            : icon === "alert"
              ? "mx-auto text-red-500"
              : "mx-auto animate-spin text-[var(--color-primary)]"
        }
      />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-[#292929]">
        {title}
      </h1>
      {body && (
        <p className="mt-3 text-sm text-[#686963]">{body}</p>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Result icon="loading" title="Loading…" body="" />}>
      <VerifyContent />
    </Suspense>
  );
}
