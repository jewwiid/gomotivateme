// @ts-nocheck — see convex/goals.ts header.
/**
 * Structured support messages — attributed, like a wall of supporters' notes.
 * Different from the anonymous emoji `reactions` table.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const SUPPORT_TYPES = ["encourage", "experience", "advice", "checkin", "join"] as const;

/** Create a structured support message. The author must be a supporter. */
export const create = mutation({
  args: {
    goalId: v.id("goals"),
    supportType: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { goalId, supportType, body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (!SUPPORT_TYPES.includes(supportType as (typeof SUPPORT_TYPES)[number])) {
      throw new Error("Invalid support type");
    }
    const trimmed = body.trim();
    if (trimmed.length === 0) throw new Error("Message is empty");
    if (trimmed.length > 1000) throw new Error("Message is too long (1000 max)");

    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.status === "closed") {
      throw new Error("This campaign is closed");
    }

    // Auto-join as a supporter so the wall is consistent.
    const existing = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q) => q.eq("goalId", goalId).eq("userId", userId))
      .first();
    if (!existing) {
      await ctx.db.insert("supporters", {
        goalId,
        userId,
        supportType: supportType as any,
        createdAt: Date.now(),
      });
      await ctx.db.patch(goalId, {
        supporterCount: (goal.supporterCount ?? 0) + 1,
      });
    }

    const messageId = await ctx.db.insert("supportMessages", {
      goalId,
      authorId: userId,
      supportType: supportType as any,
      body: trimmed,
      moderationStatus: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.moderation.reviewSupportMessage, { messageId });
    return messageId;
  },
});

/** Public: list non-hidden support messages for a goal. */
export const listForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const all = await ctx.db
      .query("supportMessages")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    return all
      .filter((m) => !m.hiddenAt && (!m.moderationStatus || m.moderationStatus === "approved"))
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** Owner-only: list all messages including hidden. */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("supportMessages")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
  },
});

/** Owner-only: hide (soft-delete) a message. */
export const hide = mutation({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const m = await ctx.db.get(messageId);
    if (!m) throw new Error("Not found");
    const goal = await ctx.db.get(m.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(messageId, { hiddenAt: Date.now() });
  },
});

/** Owner-only: hard-delete a message. */
export const remove = mutation({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const m = await ctx.db.get(messageId);
    if (!m) throw new Error("Not found");
    const goal = await ctx.db.get(m.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    await ctx.db.delete(messageId);
  },
});
