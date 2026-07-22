"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider, type TokenStorage } from "@convex-dev/auth/react";
import { ReactNode, useEffect, useState } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // NOTE: the @convex-dev/auth docs claim `ConvexAuthProvider` falls
  // back to `localStorage` if no `storage` prop is provided — that's
  // a lie. client.js:249 actually does
  // `peristentStorage ?? inMemoryStorage()`, so without this prop the
  // JWT lives only in JS memory and is wiped on every page refresh.
  // Pass `window.localStorage` explicitly so the session survives a
  // hard reload.
  //
  // We initialize `storage` to `null` (matches the SSR HTML) and then
  // set it to `window.localStorage` in a `useEffect`. The first client
  // render also sees `null` (so React doesn't yell about a hydration
  // mismatch), then re-renders with the real localStorage on the next
  // tick. The auth library's `useEffect` reads the token on every
  // mount, so as soon as we hand it a real storage it will pull the
  // JWT out and mark us authenticated.
  const [storage, setStorage] = useState<TokenStorage | null>(null);
  useEffect(() => {
    setStorage(window.localStorage as unknown as TokenStorage);
  }, []);

  return (
    <ConvexAuthProvider client={convex} storage={storage}>
      {children}
    </ConvexAuthProvider>
  );
}
