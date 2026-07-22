// @ts-nocheck — see convex/goals.ts header.
/**
 * Admin escape hatches for production data.
 *
 * These are `internalMutation`s so they're only callable from the
 * Convex CLI (`npx convex run admin:...`) or from another Convex
 * function that explicitly invokes them. The client SDK cannot reach
 * them, so they're safe to keep in the codebase without an HTTP gate.
 *
 * What lives here (so far):
 *  - `resetPasswordByEmail`: find a user by email, hash a new password
 *    the same way the @convex-dev/auth Password provider does (Scrypt
 *    via the `lucia` package), patch the corresponding account row's
 *    `secret`. Keeps the user, all goals, all motivations, just
 *    rotates the password.
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
import { Scrypt } from "lucia";
import { internalMutation } from "./_generated/server";

/**
 * Reset the password for the user with the given email. Keeps all
 * other data (goals, motivations, profile fields) intact.
 */
export const resetPasswordByEmail = internalMutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email, newPassword }) => {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }

    // 1. Find the user by email.
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error(`No user found for email: ${email}`);
    }

    // 2. Find the password-provider account row for that user.
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", user._id).eq("provider", "password")
      )
      .first();
    if (!account) {
      throw new Error(
        `User ${email} exists but has no 'password' provider account. ` +
          `They may have signed in via another provider.`
      );
    }

    // 3. Hash with the same Scrypt settings @convex-dev/auth's
    //    Password provider uses, so the existing `verifySecret` will
    //    accept the new password without any other changes.
    const newSecret = await new Scrypt().hash(newPassword);

    // 4. Patch the secret. (We don't touch `secretVersion` here — the
    //    Password provider's verifySecret works against the latest
    //    secret regardless of the version field.)
    await ctx.db.patch(account._id, { secret: newSecret });

    return {
      ok: true,
      userId: user._id,
      email: user.email,
      hashedBytes: newSecret.length,
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
