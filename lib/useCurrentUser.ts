"use client";

import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

export type CurrentUser = {
  _id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  handle: string | null;
  bio: string | null;
  coverImageId: string | null;
};

/**
 * Returns the currently signed-in user, or null when signed out / loading.
 * Combines Convex's `useConvexAuth` (token / handshake state) with the
 * `users.me` query to fetch the profile row.
 */
export function useCurrentUser(): {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading) return { user: null, isLoading: true, isAuthenticated: false };
  if (!isAuthenticated) return { user: null, isLoading: false, isAuthenticated: false };
  return {
    user: (user as CurrentUser | null) ?? null,
    isLoading: user === undefined,
    isAuthenticated: true,
  };
}
