// @ts-nocheck — see convex/goals.ts header.
/**
 * Anonymous emoji cheer (replaces the old "thumbsup" + free-form message model).
 * One emoji per visitor per goal. Structured support lives in `supporters` and
 * `supportMessages` instead.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const EMOJI_KINDS = ["thumbsup", "muscle", "heart", "fire"] as const;
type EmojiKind = (typeof EMOJI_KINDS)[number];

/**
 * Rate limit: max reactions per visitorKey in the rolling window.
 * Prevents cycling visitorKeys to flood a goal with fake reactions.
 */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

/**
 * Throws if the visitor has created too many reactions recently.
 * Counts across ALL goals + updates (global per-visitor rate).
 */
async function enforceRateLimit(ctx: any, visitorKey: string) {
  const since = Date.now() - RATE_LIMIT_WINDOW_MS;
  const recent = await ctx.db
    .query("reactions")
    .withIndex("by_visitor_created", (q) => q.eq("visitorKey", visitorKey).gte("createdAt", since))
    .take(RATE_LIMIT_MAX + 1);
  if (recent.length > RATE_LIMIT_MAX) {
    throw new Error("You're reacting too fast. Slow down a moment.");
  }
}

const EMOJI_LABELS: Record<EmojiKind, string> = {
  thumbsup: "👍",
  muscle: "💪",
  heart: "❤️",
  fire: "🔥",
};

/**
 * Enqueue a "new reaction" email to the goal owner. Only fires on new
 * reactions (not toggles/updates). Uses lifecycle category so it respects
 * unsubscribedAll. Throttled to:
 *   - Milestone counts only (1, 5, 10, 25, 50, 100, 200, 500...)
 *   - At most 1 email per goal per hour (cooldown via lastReactionEmailAt)
 */
async function maybeNotifyOwnerOfReaction(
  ctx: any,
  goalId: any,
  emoji: EmojiKind,
  targetType: "goal" | "update",
) {
  const goal = await ctx.db.get(goalId);
  if (!goal) return;
  const owner = await ctx.db.get(goal.ownerId);
  if (!owner?.email) return;

  // Cooldown: at most 1 reaction email per goal per hour.
  const COOLDOWN_MS = 60 * 60 * 1000;
  if (goal.lastReactionEmailAt && Date.now() - goal.lastReactionEmailAt < COOLDOWN_MS) {
    return;
  }

  // Count total emoji reactions on this goal (goal-level only, for rate limiting).
  const allReactions = await ctx.db
    .query("reactions")
    .withIndex("by_goal_kind", (q) => q.eq("goalId", goalId).eq("kind", "emoji"))
    .collect();
  const total = allReactions.length;

  // Rate limit: only send at milestone counts to avoid spamming.
  const MILESTONES = new Set([1, 5, 10, 25, 50, 100, 200, 500, 1000]);
  if (!MILESTONES.has(total)) return;

  // Stamp the cooldown timestamp so future reactions within the hour are suppressed.
  await ctx.db.patch(goalId, { lastReactionEmailAt: Date.now() });

  const ownerName = owner.name ?? owner.handle ?? "there";
  await ctx.runMutation(internal.emails.enqueue, {
    userId: goal.ownerId,
    toEmail: owner.email,
    templateId: "newReaction",
    category: "lifecycle",
    payload: JSON.stringify({
      ownerName,
      goalTitle: goal.title,
      goalSlug: goal.slug,
      ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
      emojiLabel: EMOJI_LABELS[emoji],
      targetType,
      totalReactions: total,
    }),
  });
}

/** Public stats for the cheer bar (goal-level only, excludes update reactions). */
export const publicStats = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const all = await ctx.db
      .query("reactions")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    // Only count goal-level cheers (updateId undefined), not per-update reactions.
    const emojis = all.filter((r) => r.kind === "emoji" && r.updateId === undefined);
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
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, visitorKey, emoji, displayName }) => {
    if (!visitorKey) throw new Error("Missing visitor key");
    if (!EMOJI_KINDS.includes(emoji)) throw new Error("Invalid emoji kind");
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.visibility !== "public") throw new Error("This goal isn't public");

    await enforceRateLimit(ctx, visitorKey);

    // Auto-resolve displayName from auth if the visitor is signed in.
    let resolvedName = displayName?.trim() || undefined;
    if (!resolvedName) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const user = await ctx.db.get(userId);
        if (user?.name) resolvedName = user.name;
        else if (user?.handle) resolvedName = user.handle;
      }
    }

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
      await ctx.db.patch(existing._id, {
        emoji,
        createdAt: Date.now(),
        ...(resolvedName !== undefined ? { displayName: resolvedName } : {}),
      });
      return { state: "updated" as const, emoji };
    }

    await ctx.db.insert("reactions", {
      goalId,
      kind: "emoji",
      emoji,
      visitorKey,
      approved: true,
      createdAt: Date.now(),
      ...(resolvedName !== undefined ? { displayName: resolvedName } : {}),
    });
    await maybeNotifyOwnerOfReaction(ctx, goalId, emoji, "goal");
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

// =====================================================================
// Per-update reactions — react to individual timeline entries
// =====================================================================

/** Stats for a single update's reactions. */
export const updateStats = query({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const all = await ctx.db
      .query("reactions")
      .withIndex("by_update", (q) => q.eq("updateId", updateId))
      .collect();
    const emojis = all.filter((r) => r.kind === "emoji");
    const counts: Record<string, number> = { thumbsup: 0, muscle: 0, heart: 0, fire: 0 };
    for (const r of emojis) {
      if (r.emoji) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }
    return { emojiCounts: counts, emojiTotal: emojis.length };
  },
});

/** The visitor's current emoji on a specific update, if any. */
export const visitorUpdateEmoji = query({
  args: { updateId: v.id("updates"), visitorKey: v.string() },
  handler: async (ctx, { updateId, visitorKey }) => {
    if (!visitorKey) return null;
    const hit = await ctx.db
      .query("reactions")
      .withIndex("by_update_kind_visitor", (q) =>
        q.eq("updateId", updateId).eq("kind", "emoji").eq("visitorKey", visitorKey)
      )
      .first();
    return hit?.emoji ?? null;
  },
});

/**
 * Set the visitor's emoji reaction on a specific update. Same toggle
 * behavior as setEmoji: tap new → upsert, tap same → remove.
 */
export const setUpdateEmoji = mutation({
  args: {
    updateId: v.id("updates"),
    goalId: v.id("goals"),
    visitorKey: v.string(),
    emoji: v.union(
      v.literal("thumbsup"),
      v.literal("muscle"),
      v.literal("heart"),
      v.literal("fire")
    ),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { updateId, goalId, visitorKey, emoji, displayName }) => {
    if (!visitorKey) throw new Error("Missing visitor key");
    if (!EMOJI_KINDS.includes(emoji)) throw new Error("Invalid emoji kind");
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.visibility !== "public") throw new Error("This goal isn't public");

    await enforceRateLimit(ctx, visitorKey);

    // Auto-resolve displayName from auth if the visitor is signed in.
    let resolvedName = displayName?.trim() || undefined;
    if (!resolvedName) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const user = await ctx.db.get(userId);
        if (user?.name) resolvedName = user.name;
        else if (user?.handle) resolvedName = user.handle;
      }
    }

    // Validate the update belongs to this goal.
    const update = await ctx.db.get(updateId);
    if (!update || update.goalId !== goalId) throw new Error("Update not found");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_update_kind_visitor", (q) =>
        q.eq("updateId", updateId).eq("kind", "emoji").eq("visitorKey", visitorKey)
      )
      .first();

    if (existing) {
      if (existing.emoji === emoji) {
        await ctx.db.delete(existing._id);
        return { state: "removed" as const, emoji: null };
      }
      await ctx.db.patch(existing._id, {
        emoji,
        createdAt: Date.now(),
        ...(resolvedName !== undefined ? { displayName: resolvedName } : {}),
      });
      return { state: "updated" as const, emoji };
    }

    await ctx.db.insert("reactions", {
      goalId,
      updateId,
      kind: "emoji",
      emoji,
      visitorKey,
      approved: true,
      createdAt: Date.now(),
      ...(resolvedName !== undefined ? { displayName: resolvedName } : {}),
    });
    await maybeNotifyOwnerOfReaction(ctx, goalId, emoji, "update");
    return { state: "added" as const, emoji };
  },
});
