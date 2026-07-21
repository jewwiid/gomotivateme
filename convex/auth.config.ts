import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Convex Auth configuration.
 * Email + password for the MVP. Add OAuth providers (Google, Apple) here later.
 */
export default {
  providers: [Password],
};
