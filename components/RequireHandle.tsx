"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * Client-side guard that ensures an authenticated user has chosen a handle
 * before they can reach any app page. Mirrors RequireAuth's structure.
 *
 * Used by RequireAuth itself: once a user is signed in, this checks that
 * they have a handle and redirects to /setup if not. Handles are locked
 * after creation, so we make the choice explicit (esp. for Google OAuth
 * users, who land authenticated but with no handle).
 *
 * This guard is a no-op for signed-out users — RequireAuth handles that,
 * and /setup itself is wrapped only in RequireAuth (not RequireHandle)
 * to avoid a redirect loop.
 */
export function RequireHandle({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading, when signed out (RequireAuth's job),
    // or from the setup page itself (where we're going).
    if (isLoading || !isAuthenticated || !user) return;
    if (pathname === "/setup") return;
    if (!user.handle) router.replace("/setup");
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading || (isAuthenticated && user && !user.handle && pathname !== "/setup")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  return <>{children}</>;
}
