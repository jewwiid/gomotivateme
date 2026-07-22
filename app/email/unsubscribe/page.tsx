"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [done, setDone] = useState(false);

  const unsubscribe = useMutation(api.notificationPrefs.unsubscribeByToken);

  useEffect(() => {
    if (!token) return;
    void unsubscribe({ token }).then((res) => setDone(true));
    // Run once per token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <Result icon="alert" title="Missing token" body="This unsubscribe link is incomplete." />;
  }
  if (!done) {
    return <Result icon="loading" title="Processing…" body="Turning off your emails." />;
  }
  return (
    <Result
      icon="check"
      title="You're unsubscribed"
      body="You won't receive any more promotional or digest emails from gomotivateme. Important account emails (like password resets) will still come through."
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <Icon
        size={48}
        className={
          icon === "check"
            ? "text-[var(--color-success)]"
            : icon === "alert"
              ? "text-[var(--color-danger)]"
              : "animate-spin text-[var(--color-primary)]"
        }
      />
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--color-text)]">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<Result icon="loading" title="Loading…" body="" />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
