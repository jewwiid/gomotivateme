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

/**
 * Merge a duplicate user (`fromUserId`) into the canonical one
 * (`toUserId`). Use when a single human ended up with two rows because
 * they signed up via Google in one session and password in another
 * (or any other reason that produced duplicates with the same email).
 *
 * What this does, atomically:
 *  1. Re-points every `authAccount` from `fromUserId` to `toUserId`.
 *     If `toUserId` already has an account for the same
 *     (provider, providerAccountId), the duplicate is dropped.
 *  2. Re-points every active `authSession` to `toUserId`.
 *  3. Re-points `ownerId` / `userId` / `motivatorId` / `applicantId` /
 *     `invitedUserId` / `creatorId` / `authorId` across every business
 *     table so goals, updates, supports, pledges, etc. all show up
 *     under the canonical user.
 *  4. Merges profile fields the duplicate had and the canonical
 *     didn't — handle (the @-name), isAdmin, anything else we don't
 *     want to lose. Non-null fields on the canonical win.
 *  5. Deletes the duplicate `users` row.
 *
 * Both users must already exist; the mutation refuses to no-op so you
 * can't accidentally wipe data by passing a stale id.
 *
 * Invoke:
 *   export CONVEX_DEPLOY_KEY=prod:...
 *   npx convex run admin:mergeDuplicateUsers \
 *     '{"toUserId":"kn7ap9wv77w4v20v4yw5bf5sz18b06p8","fromUserId":"kn78b8yw3ygatd31tqrdghm2a18b19fy"}'
 */
export const mergeDuplicateUsers = internalMutation({
  args: {
    toUserId: v.id("users"),
    fromUserId: v.id("users"),
  },
  handler: async (ctx, { toUserId, fromUserId }) => {
    if (toUserId === fromUserId) {
      throw new Error("toUserId and fromUserId are the same — refusing");
    }
    const to = await ctx.db.get(toUserId);
    const from = await ctx.db.get(fromUserId);
    if (!to) throw new Error(`toUserId not found: ${toUserId}`);
    if (!from) throw new Error(`fromUserId not found: ${fromUserId}`);

    // --- 1. Auth accounts ---
    // Build a set of (provider, providerAccountId) tuples the canonical
    // user already holds so we can resolve conflicts.
    const existingAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", toUserId))
      .collect();
    const existingKeys = new Set(
      existingAccounts.map(
        (a) => `${a.provider}::${(a as { providerAccountId: string }).providerAccountId}`
      )
    );

    const fromAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", fromUserId))
      .collect();
    let accountsRePointed = 0;
    let accountsDroppedAsDuplicate = 0;
    for (const a of fromAccounts) {
      const key = `${a.provider}::${(a as { providerAccountId: string }).providerAccountId}`;
      if (existingKeys.has(key)) {
        // The canonical user already owns this (provider, accountId).
        // Drop the duplicate rather than re-point it (unique constraint
        // would reject the patch otherwise).
        await ctx.db.delete(a._id);
        accountsDroppedAsDuplicate += 1;
      } else {
        await ctx.db.patch(a._id, { userId: toUserId });
        existingKeys.add(key);
        accountsRePointed += 1;
      }
    }

    // --- 2. Auth sessions ---
    const fromSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", fromUserId))
      .collect();
    let sessionsRePointed = 0;
    for (const s of fromSessions) {
      await ctx.db.patch(s._id, { userId: toUserId });
      sessionsRePointed += 1;
    }

    // --- 3. Foreign keys across business tables ---
    // Each entry: { table, ownerField }. Convex doesn't expose
    // by-index predicates generically, so we query each table with a
    // full scan and patch the docs. Tables are small enough (low
    // thousands) that this is fine for a one-off merge.
    const rePointTables: Array<{
      table: "goals" | "updates" | "mediaUploadIntents" | "badges" | "supportMessages" | "reactions" | "motivatorInvites" | "motivatorPledges" | "motivatorApplications" | "checkIns" | "supporters" | "notificationPrefs";
      field: string;
    }> = [
      { table: "goals", field: "ownerId" },
      { table: "updates", field: "ownerId" },
      { table: "mediaUploadIntents", field: "ownerId" },
      { table: "badges", field: "ownerId" },
      { table: "supportMessages", field: "authorId" },
      { table: "reactions", field: "userId" },
      { table: "motivatorInvites", field: "creatorId" },
      { table: "motivatorInvites", field: "invitedUserId" },
      { table: "motivatorPledges", field: "motivatorId" },
      { table: "motivatorPledges", field: "creatorId" },
      { table: "motivatorApplications", field: "applicantId" },
      { table: "checkIns", field: "userId" },
      { table: "supporters", field: "userId" },
      { table: "notificationPrefs", field: "userId" },
    ];

    const refsRePointed: Record<string, number> = {};
    for (const { table, field } of rePointTables) {
      const rows = await ctx.db.query(table).collect();
      let count = 0;
      for (const row of rows) {
        const v = (row as Record<string, unknown>)[field];
        if (v === fromUserId) {
          await ctx.db.patch(row._id, { [field]: toUserId });
          count += 1;
        }
      }
      if (count > 0) refsRePointed[`${table}.${field}`] = count;
    }

    // --- 4. Merge profile fields ---
    // Non-null fields on `to` win; fill in anything `to` is missing
    // from `from`. The only fields the duplicate might have that the
    // canonical doesn't are handle + isAdmin (the typical scenario).
    const mergePatch: Record<string, unknown> = {};
    const fromRecord = from as Record<string, unknown>;
    const toRecord = to as Record<string, unknown>;
    if (!toRecord.handle && fromRecord.handle) mergePatch.handle = fromRecord.handle;
    if (!toRecord.isAdmin && fromRecord.isAdmin) mergePatch.isAdmin = fromRecord.isAdmin;
    if (Object.keys(mergePatch).length > 0) {
      await ctx.db.patch(toUserId, mergePatch);
    }

    // --- 5. Delete the duplicate ---
    await ctx.db.delete(fromUserId);

    return {
      ok: true,
      toUserId,
      fromUserId,
      accountsRePointed,
      accountsDroppedAsDuplicate,
      sessionsRePointed,
      refsRePointed,
      profileFieldsMerged: Object.keys(mergePatch),
    };
  },
});
