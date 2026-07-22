"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider, type TokenStorage } from "@convex-dev/auth/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Module-level reference to localStorage so the auth library's
// `useMemo` doesn't see a different object identity on every render.
// Defined lazily so SSR (where `window` is undefined) doesn't crash.
const storage: TokenStorage | undefined =
  typeof window !== "undefined"
    ? (window.localStorage as unknown as TokenStorage)
    : undefined;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // NOTE: the @convex-dev/auth docs claim `ConvexAuthProvider` falls back
  // to `localStorage` if no `storage` prop is provided — that's a lie.
  // client.js:249 actually does `peristentStorage ?? inMemoryStorage()`,
  // so without this prop the JWT lives only in JS memory and is wiped on
  // every page refresh. Pass `window.localStorage` explicitly so the
  // session survives a hard reload.
  //
  // During SSR `storage` is `undefined`. The auth library's effect
  // runs only on the client, so by the time it reads the storage, the
  // real localStorage is in scope. (`storage` is module-level so its
  // identity is stable across renders — important because the provider
  // memoizes against it.)
  return (
    <ConvexAuthProvider client={convex} storage={storage}>
      {children}
    </ConvexAuthProvider>
  );
}
