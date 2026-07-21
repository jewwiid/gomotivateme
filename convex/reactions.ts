// @ts-nocheck — see convex/goals.ts header.
/**
 * Anonymous emoji cheer (replaces the old "thumbsup" + free-form message model).
 * One emoji per visitor per goal. Structured support lives in `supporters` and
 * `supportMessages` instead.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const EMOJI_KINDS = ["thumbsup", "muscle", "heart", "fire"] as const;
type EmojiKind = (typeof EMOJI_KINDS)[number];

/** Public stats for the cheer bar. */
export const publicStats = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const all = await ctx.db
      .query("reactions")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const emojis = all.filter((r) => r.kind === "emoji");
    const counts: Record<string, number> = { thumbsup: 0, muscle: 0, heart: 0, fire: 0 };
    for (const r of emojis) {
      if (r.emoji) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }
    return { emojiCounts: counts, emojiTotal: emojis.length };
  },
});

/** The visitor's current emoji on this goal, if any. */
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

/** Recent cheerers (anonymous, for the public page "cheer" feed). */
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
 *   - tap a new emoji → upsert
 *   - tap the same emoji again → delete (toggle off)
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
    if (goal.visibility !== "public") throw new Error("This goal isn't public");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_goal_kind_visitor", (q) =>
        q.eq("goalId", goalId).eq("kind", "emoji").eq("visitorKey", visitorKey)
      )
      .first();

    if (existing) {
      if (existing.emoji === emoji) {
        await ctx.db.delete(existing._id);
        return { state: "removed" as const, emoji: null };
      }
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

/** Owner: list all emoji reactions (for moderation). */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("reactions")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
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
