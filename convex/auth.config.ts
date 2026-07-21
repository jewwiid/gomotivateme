/**
 * Convex Auth configuration.
 *
 * For email + password auth only, providers is an empty list. OAuth
 * providers (Google, GitHub, etc.) get added here with their
 * `domain` + `applicationID`. The Password provider itself is wired up
 * in `convex/auth.ts` via `convexAuth({ providers: [Password] })`.
 */
export default {
  providers: [],
};
