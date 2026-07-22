// @ts-nocheck — see convex/goals.ts header.
/**
 * Admin escape hatches for production data.
 *
 * These are `internalAction` / `internalMutation`s so they're only
 * callable from the Convex CLI (`npx convex run admin:...`) or from
 * another Convex function that explicitly invokes them. The client
 * SDK cannot reach them, so they're safe to keep in the codebase
 * without an HTTP gate.
 *
 * What lives here (so far):
 *  - `resetPasswordByEmail`: find a user by email, route the new
 *    password through `@convex-dev/auth`'s `modifyAccountCredentials`
 *    — which calls the Password provider's own `crypto.hashSecret`
 *    (lucia Scrypt) under the hood. This guarantees the resulting
 *    hash is byte-identical to what signup would produce, so the
 *    existing `verifySecret` accepts the new password without any
 *    other changes. Keeping the user, all goals, all motivations —
 *    just rotates the password. Implemented as an `internalAction`
 *    because `modifyAccountCredentials` itself dispatches to
 *    `auth:store` via `ctx.runMutation`, which only actions have.
 *  - `deleteUserByEmail`: nuke the user + all their auth accounts +
 *    active sessions. Use when the user wants a clean re-signup
 *    with a fresh password. **This is destructive** — make sure you
 *    have a backup or a clear plan before invoking.
 *
 * How to invoke (from the project root):
 *
 *   export CONVEX_DEPLOY_KEY=prod:...
 *   npx convex run admin:resetPasswordByEmail \\
 *     '{"email":"you@example.com","newPassword":"<new-pass>"}'
 *
 *   npx convex run admin:deleteUserByEmail \\
 *     '{"email":"you@example.com"}'
 *
 * If you don't need these any more, delete the file — codegen will
 * strip the function references on the next deploy.
 */
import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
} from "./_generated/server";
import { modifyAccountCredentials } from "@convex-dev/auth/server";

/**
 * Reset the password for the user with the given email. Keeps all
 * other data (goals, motivations, profile fields) intact.
 *
 * Implemented as an `internalAction` so we can call
 * `modifyAccountCredentials`, which dispatches the actual hash+patch
 * through `auth:store` — the same internal mutation the Password
 * provider's own `reset-verification` flow uses. This sidesteps a
 * real bug: when we previously called `new Scrypt().hash(pw)` from
 * the admin mutation directly, the resulting hash verified locally
 * but did NOT verify on Convex (the runtime's bundler appears to
 * resolve the `lucia` package's custom scrypt impl differently than
 * the Password provider's bundle, so the two produced different
 * `targetKey`s for the same input). Routing through the auth
 * provider's own `hashSecret` removes that whole class of mismatch.
 */
export const resetPasswordByEmail = internalAction({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email, newPassword }) => {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }

    // `modifyAccountCredentials` looks up the auth account by
    // (provider, providerAccountId == email) and patches `secret` to
    // `await hashSecret(plainPassword)`. It throws if no such account
    // exists, so a missing user/email surfaces as a clear error.
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });

    return {
      ok: true,
      email,
      // We don't return userId here — admin invocations don't need
      // it, and looking it up just to return it costs an extra query.
    };
  },
});

/**
 * Delete the user with the given email, plus all their auth accounts
 * and active sessions. Goal/motivation/etc. rows owned by this user
 * are left in place (the foreign keys still point at the user; you'd
 * want a separate `purgeUserData` for full GDPR-style deletion).
 */
export const deleteUserByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error(`No user found for email: ${email}`);
    }

    // Wipe auth accounts.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();
    for (const a of accounts) {
      await ctx.db.delete(a._id);
    }

    // Wipe sessions.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    // Wipe the user row itself. (Goals/motivations/etc. owned by
    // this user remain — they reference a now-missing userId.)
    await ctx.db.delete(user._id);

    return {
      ok: true,
      email,
      accountsRemoved: accounts.length,
      sessionsRemoved: sessions.length,
    };
  },
});
