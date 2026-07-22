import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
// Google is an `@auth/core` generic OAuth provider — that's where the
// shared OAuth abstractions live. `@convex-dev/auth` only ships
// domain-specific providers (Password, Email, Phone, Anonymous) that
// need a custom shape; OAuth providers come from `@auth/core`.
// Required env vars: AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (set on dev
// and prod via `npx convex env set`).
import Google from "@auth/core/providers/google";

/**
 * Convex Auth server entry point.
 * `auth`, `signIn`, `signOut`, `store`, and `isAuthenticated` are wired up
 * automatically. `isAuthenticated` is required by the Next.js helpers as of
 * @convex-dev/auth 0.0.76.
 *
 * The Google provider reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from
 * the Convex environment. The matching redirect URIs are configured in
 * Google Cloud Console at:
 *   https://<deployment>.convex.site/api/auth/callback/google
 * for each Convex deployment (dev + prod).
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});
