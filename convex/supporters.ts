// @ts-nocheck — see convex/goals.ts header.
/**
 * Supporters — the structured "I'm on your team" join model.
 * One row per (goal, user). Idempotent — joining twice updates the existing row.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const SUPPORT_TYPES = ["encourage", "experience", "advice", "checkin", "join"] as const;

/** Join a goal as a supporter (idempotent). */
export const join = mutation({
  args: {
    goalId: v.id("goals"),
    supportType: v.string(),
    pledge: v.optional(v.string()),
    checkInFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("justThisOne")
      )
    ),
  },
  handler: async (ctx, { goalId, supportType, pledge, checkInFrequency }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (!SUPPORT_TYPES.includes(supportType as (typeof SUPPORT_TYPES)[number])) {
      throw new Error("Invalid support type");
    }
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (!goal.publicEnabled && goal.visibility !== "public") {
      // publicEnabled is legacy; visibility is the source of truth now.
    }
    if (goal.status === "closed" || goal.status === "completed") {
      throw new Error("This campaign isn't accepting new supporters");
    }

    const existing = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q) => q.eq("goalId", goalId).eq("userId", userId))
      .first();

    if (existing) {
      // Update existing membership.
      await ctx.db.patch(existing._id, {
        supportType: supportType as any,
        pledge: pledge?.trim() || undefined,
        checkInFrequency,
        createdAt: Date.now(), // bump so they show up at the top of "recent"
      });
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("supporters", {
      goalId,
      userId,
      supportType: supportType as any,
      pledge: pledge?.trim() || undefined,
      checkInFrequency,
      createdAt: Date.now(),
    });
    // Maintain the denormalized supporter count.
    await ctx.db.patch(goalId, { supporterCount: (goal.supporterCount ?? 0) + 1 });
    return { id, created: true };
  },
});

/** Leave a goal (remove your support). */
export const leave = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Not found");

    const existing = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q) => q.eq("goalId", goalId).eq("userId", userId))
      .first();
    if (!existing) return { removed: false };

    await ctx.db.delete(existing._id);
    await ctx.db.patch(goalId, {
      supporterCount: Math.max(0, (goal.supporterCount ?? 0) - 1),
    });
    return { removed: true };
  },
});

/** List supporters for a goal (public). Newest first. */
export const listForGoal = query({
  args: { goalId: v.id("goals"), limit: v.optional(v.number()) },
  handler: async (ctx, { goalId, limit }) => {
    const all = await ctx.db
      .query("supporters")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all.slice(0, limit ?? 50);
  },
});

/** Has the current user joined this goal? */
export const amISupporting = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q) => q.eq("goalId", goalId).eq("userId", userId))
      .first();
    if (!row) return null;
    return {
      supportType: row.supportType,
      pledge: row.pledge,
      checkInFrequency: row.checkInFrequency,
      createdAt: row.createdAt,
    };
  },
});

/** Owner: list all supporters for their goal with their profile. */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("supporters")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
  },
});
