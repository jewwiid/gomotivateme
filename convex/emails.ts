// @ts-nocheck — see convex/goals.ts header.
/**
 * Email send layer — mutations + queries (isolate runtime).
 *
 * The Node-dependent drain action lives in `convex/emailsActions.ts`
 * (with `"use node"`) so Resend + React Email can be imported there.
 *
 * Flow:
 *   1. `enqueue` (internalMutation) — called from trigger points via
 *      `ctx.runMutation(internal.emails.enqueue, {...})`. Writes a
 *      `notifications` row. Checks prefs: lifecycle email to a user who
 *      opted out is marked "suppressed" and never sent.
 *   2. `drainQueue` (in emailsActions.ts, Node runtime) — runs on a cron,
 *      calls Resend, marks rows sent/failed via markSent/markFailed here.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// =====================================================================
// Enqueue — write a notification row from a trigger mutation.
// =====================================================================

export const enqueue = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    toEmail: v.string(),
    templateId: v.string(),
    payload: v.string(),
    category: v.union(v.literal("transactional"), v.literal("lifecycle")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Pref check: suppress lifecycle email to opted-out users.
    if (args.userId && args.category === "lifecycle") {
      const prefs = await ctx.runMutation(internal.notificationPrefs.getForUser, {
        userId: args.userId,
      });
      if (prefs?.unsubscribedAll) {
        await ctx.db.insert("notifications", {
          ...args,
          status: "suppressed",
          attempts: 0,
          createdAt: now,
        });
        return { status: "suppressed" as const };
      }
    }

    await ctx.db.insert("notifications", {
      ...args,
      status: "pending",
      attempts: 0,
      createdAt: now,
    });
    return { status: "pending" as const };
  },
});

// =====================================================================
// Drain helpers — called by the Node action (emailsActions.ts).
// =====================================================================

/** Internal query: fetch up to `limit` pending notifications, oldest first. */
export const getPending = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 20;
    return await ctx.db
      .query("notifications")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(take);
  },
});

export const markSent = internalMutation({
  args: { id: v.id("notifications"), resendId: v.optional(v.string()) },
  handler: async (ctx, { id, resendId }) => {
    const patch: any = { status: "sent", sentAt: Date.now(), attempts: 1 };
    if (resendId) patch.resendId = resendId;
    await ctx.db.patch(id, patch);
  },
});

export const markFailed = internalMutation({
  args: { id: v.id("notifications"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.patch(id, {
      error,
      attempts: (doc.attempts ?? 0) + 1,
      // Keep retrying up to 3 attempts, then mark failed permanently.
      status: (doc.attempts ?? 0) + 1 >= 3 ? "failed" : "pending",
    });
  },
});
