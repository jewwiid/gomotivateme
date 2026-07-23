"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { RequireHandle } from "@/components/RequireHandle";

/**
 * Client-side guard for dashboard pages. Redirects to /login when not signed in.
 * Shows a brief skeleton while the auth state is loading.
 *
 * Once authenticated, composes RequireHandle so that users without a handle
 * (e.g. Google OAuth sign-ins) are sent to /setup before reaching the app.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user) return null; // mid-redirect
  return <RequireHandle>{children}</RequireHandle>;
}
