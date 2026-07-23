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

    // Email B6 — "Support message received" → to the goal owner.
    // Fires on create (pre-moderation): the owner sees it on their dashboard
    // anyway; moderation gates public visibility, not owner notification.
    const owner = await ctx.db.get(goal.ownerId);
    if (owner?.email && goal.ownerId !== userId) {
      const author = await ctx.db.get(userId);
      const typeLabels: Record<string, string> = {
        encourage: "encouragement",
        experience: "a shared experience",
        advice: "advice",
        checkin: "a check-in",
        join: "support",
      };
      await ctx.runMutation(internal.emails.enqueue, {
        userId: goal.ownerId,
        toEmail: owner.email,
        templateId: "supportMessageReceived",
        category: "transactional",
        payload: JSON.stringify({
          ownerName: owner.name ?? owner.handle ?? "there",
          authorName: author?.name ?? author?.handle ?? "Someone",
          goalTitle: goal.title,
          goalSlug: goal.slug,
          messageExcerpt: trimmed.slice(0, 160),
          supportTypeLabel: typeLabels[supportType] ?? "support",
        }),
      });
    }

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
