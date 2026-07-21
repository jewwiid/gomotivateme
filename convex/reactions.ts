// @ts-nocheck — see convex/goals.ts header.
/**
 * Public reactions — emoji cheer (one per visitor per goal) and messages.
 * All public, no auth needed. Messages default to pending; owner approves.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const EMOJI_KINDS = ["thumbsup", "muscle", "heart", "fire"] as const;
type EmojiKind = (typeof EMOJI_KINDS)[number];

/** Public stats for a goal: emoji counts + approved messages + the visitor's own reaction. */
export const publicStats = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const all = await ctx.db
      .query("reactions")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const emojis = all.filter((r) => r.kind === "emoji");
    const counts: Record<string, number> = {
      thumbsup: 0,
      muscle: 0,
      heart: 0,
      fire: 0,
    };
    for (const r of emojis) {
      if (r.emoji) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }
    const messages = all
      .filter((r) => r.kind === "message" && r.approved)
      .sort((a, b) => a.createdAt - b.createdAt);
    return {
      emojiCounts: counts,
      emojiTotal: emojis.length,
      messages,
    };
  },
});

/** Whether the visitor has an emoji reaction on this goal and which one. */
export const visitorEmoji = query({
  args: { goalId: v.id("goals"), visitorKey: v.string() },
  handler: async (ctx, { goalId, visitorKey }) => {
    if (!visitorKey) return null;
    const hit = await ctx.db
      .query("reactions")
      .withIndex("by_goal_kind_visitor", (q) =>
        q.eq("goalId", goalId).eq("kind", "emoji").eq("visitorKey", visitorKey)
      )
      .first();
    return hit?.emoji ?? null;
  },
});

/** Recent emoji reactions for the "recent cheerers" feed. */
export const recentEmoji = query({
  args: { goalId: v.id("goals"), limit: v.optional(v.number()) },
  handler: async (ctx, { goalId, limit }) => {
    const all = await ctx.db
      .query("reactions")
      .withIndex("by_goal_kind", (q) => q.eq("goalId", goalId).eq("kind", "emoji"))
      .collect();
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all.slice(0, limit ?? 24);
  },
});

/**
 * Set the visitor's emoji reaction. Behavior:
 *   - tap a new emoji → upsert (replace any prior emoji)
 *   - tap the same emoji again → delete (toggle off)
 * Returns the resulting state so the UI can render immediately.
 */
export const setEmoji = mutation({
  args: {
    goalId: v.id("goals"),
    visitorKey: v.string(),
    emoji: v.union(
      v.literal("thumbsup"),
      v.literal("muscle"),
      v.literal("heart"),
      v.literal("fire")
    ),
  },
  handler: async (ctx, { goalId, visitorKey, emoji }) => {
    if (!visitorKey) throw new Error("Missing visitor key");
    if (!EMOJI_KINDS.includes(emoji)) throw new Error("Invalid emoji kind");
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (!goal.publicEnabled) throw new Error("This goal is private");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_goal_kind_visitor", (q) =>
        q.eq("goalId", goalId).eq("kind", "emoji").eq("visitorKey", visitorKey)
      )
      .first();

    if (existing) {
      if (existing.emoji === emoji) {
        // toggle off
        await ctx.db.delete(existing._id);
        return { state: "removed" as const, emoji: null };
      }
      // switch
      await ctx.db.patch(existing._id, { emoji, createdAt: Date.now() });
      return { state: "updated" as const, emoji };
    }

    await ctx.db.insert("reactions", {
      goalId,
      kind: "emoji",
      emoji,
      visitorKey,
      approved: true,
      createdAt: Date.now(),
    });
    return { state: "added" as const, emoji };
  },
});

/** Leave a message. Defaults to pending (approved: false). */
export const leaveMessage = mutation({
  args: {
    goalId: v.id("goals"),
    visitorKey: v.string(),
    displayName: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, { goalId, visitorKey, displayName, message }) => {
    if (!visitorKey) throw new Error("Missing visitor key");
    const trimmed = message.trim();
    if (trimmed.length === 0) throw new Error("Message is empty");
    if (trimmed.length > 500) throw new Error("Message is too long (500 max)");

    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (!goal.publicEnabled) throw new Error("This goal is private");

    const id = await ctx.db.insert("reactions", {
      goalId,
      kind: "message",
      visitorKey,
      displayName: displayName?.trim().slice(0, 40) || undefined,
      message: trimmed,
      approved: false,
      createdAt: Date.now(),
    });
    return { id };
  },
});

/** Owner-only: list all messages (approved + pending). */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    const messages = await ctx.db
      .query("reactions")
      .withIndex("by_goal_kind", (q) => q.eq("goalId", goalId).eq("kind", "message"))
      .collect();
    return messages.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const approve = mutation({
  args: { reactionId: v.id("reactions") },
  handler: async (ctx, { reactionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const r = await ctx.db.get(reactionId);
    if (!r || r.kind !== "message") throw new Error("Not found");
    const goal = await ctx.db.get(r.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(reactionId, { approved: true });
  },
});

export const unapprove = mutation({
  args: { reactionId: v.id("reactions") },
  handler: async (ctx, { reactionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const r = await ctx.db.get(reactionId);
    if (!r || r.kind !== "message") throw new Error("Not found");
    const goal = await ctx.db.get(r.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(reactionId, { approved: false });
  },
});

export const remove = mutation({
  args: { reactionId: v.id("reactions") },
  handler: async (ctx, { reactionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const r = await ctx.db.get(reactionId);
    if (!r) throw new Error("Not found");
    const goal = await ctx.db.get(r.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    await ctx.db.delete(reactionId);
  },
});
