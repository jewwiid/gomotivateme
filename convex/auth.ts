import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Convex Auth server entry point.
 * `auth`, `signIn`, `signOut`, `store`, and `isAuthenticated` are wired up
 * automatically. `isAuthenticated` is required by the Next.js helpers as of
 * @convex-dev/auth 0.0.76.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
