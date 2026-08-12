// @ts-nocheck — see convex/goals.ts header.
/**
 * Per-user email notification preferences.
 *
 * Drives suppression of lifecycle email (CAN-SPAM / GDPR). Created lazily:
 * the first time we'd enqueue an email for a user, if no prefs row exists,
 * defaults are inserted. The settings page reads + writes these via the
 * public query/mutation below.
 */
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/** Default prefs for a brand-new user. Lifecycle on, marketing off. */
export const DEFAULT_PREFS = {
  yourMotivations: true,
  supportedGoalUpdates: true,
  goalActivity: true,
  motivationActivity: true,
  socialActivity: true,
  accountActivity: true,
  newMotivatorOnGoal: true,
  weeklyDigest: false,
  dailyStreakReminder: true,
  goalUpdateReminderCadence: "weekly",
  deadlineReminders: true,
  // Marketing requires an affirmative choice under Irish ePrivacy rules.
  platformDigestCadence: "off",
  urgentCauses: true,
  productUpdates: false,
  unsubscribedAll: false,
} as const;

/**
 * Get the current user's prefs, creating defaults if none exist yet.
 * Public — called from the settings page.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (row) return row;
    // No row yet — return the defaults so the UI can render without a write.
    return { ...DEFAULT_PREFS, userId, updatedAt: 0 };
  },
});

/**
 * Update one or more pref fields. Public — called from the settings toggles.
 */
export const update = mutation({
  args: {
    yourMotivations: v.optional(v.boolean()),
    supportedGoalUpdates: v.optional(v.boolean()),
    goalActivity: v.optional(v.boolean()),
    motivationActivity: v.optional(v.boolean()),
    socialActivity: v.optional(v.boolean()),
    accountActivity: v.optional(v.boolean()),
    newMotivatorOnGoal: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),
    dailyStreakReminder: v.optional(v.boolean()),
    goalUpdateReminderCadence: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))
    ),
    deadlineReminders: v.optional(v.boolean()),
    platformDigestCadence: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))
    ),
    urgentCauses: v.optional(v.boolean()),
    productUpdates: v.optional(v.boolean()),
    unsubscribedAll: v.optional(v.boolean()),
  },
  handler: async (ctx, patch) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to update notification preferences");
    const user = await ctx.db.get(userId);
    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const enablesEmail =
      patch.yourMotivations === true ||
      patch.supportedGoalUpdates === true ||
      patch.goalActivity === true ||
      patch.motivationActivity === true ||
      patch.socialActivity === true ||
      patch.accountActivity === true ||
      patch.newMotivatorOnGoal === true ||
      patch.weeklyDigest === true ||
      patch.dailyStreakReminder === true ||
      patch.goalUpdateReminderCadence === "daily" ||
      patch.goalUpdateReminderCadence === "weekly" ||
      patch.deadlineReminders === true ||
      patch.platformDigestCadence === "daily" ||
      patch.platformDigestCadence === "weekly" ||
      patch.urgentCauses === true ||
      patch.productUpdates === true;
    // A user who switches a category back on expects to receive it again.
    // Clear the one-click global opt-out in that case.
    const effectivePatch: Record<string, any> =
      existing?.unsubscribedAll && enablesEmail
        ? { ...patch, unsubscribedAll: false }
        : patch;
    const now = Date.now();
    if (patch.platformDigestCadence === "daily" || patch.platformDigestCadence === "weekly") {
      effectivePatch.platformDigestConsentAt = now;
      effectivePatch.platformDigestOptedOutAt = undefined;
    } else if (patch.platformDigestCadence === "off") {
      effectivePatch.platformDigestOptedOutAt = now;
    }
    if (effectivePatch.unsubscribedAll === true) {
      effectivePatch.unsubscribedAt = now;
    } else if (effectivePatch.unsubscribedAll === false) {
      effectivePatch.unsubscribedAt = undefined;
    }
    const next = {
      ...DEFAULT_PREFS,
      ...(existing ?? {}),
      ...effectivePatch,
      userId,
      email: (user as { email?: string })?.email ?? existing?.email,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, { ...effectivePatch, updatedAt: now });
    } else {
      await ctx.db.insert("notificationPrefs", next);
    }
    return next;
  },
});

/**
 * Internal: get prefs for a user by id (used by emails.enqueue to decide
 * suppression). Returns defaults if no row exists yet.
 */
export const getForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    let row = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Lazily create the row with defaults so future lookups are a direct read.
    if (!row) {
      const id = await ctx.db.insert("notificationPrefs", {
        userId,
        email: (user as { email?: string })?.email,
        ...DEFAULT_PREFS,
        updatedAt: Date.now(),
      });
      row = await ctx.db.get(id);
    }
    return row;
  },
});

/**
 * One-click unsubscribe via signed token (from email footer link).
 * Suppresses all lifecycle email.
 */
export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_unsubscribe_token", (q) => q.eq("unsubscribeToken", token))
      .first();
    if (!user) return { ok: false as const, reason: "Invalid or expired link" };
    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        unsubscribedAll: true,
        unsubscribedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("notificationPrefs", {
        userId: user._id,
        email: (user as { email?: string })?.email,
        ...DEFAULT_PREFS,
        unsubscribedAll: true,
        unsubscribedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});
