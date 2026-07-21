// @ts-nocheck — see convex/goals.ts header.
/**
 * Goal CRUD — authenticated owner-only.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildSlug, computeProgress, newMilestoneTiers } from "./utils";

const CATEGORIES = [
  "weight",
  "fitness",
  "learning",
  "habit",
  "creative",
  "business",
  "custom",
] as const;

/** List the owner's goals (dashboard). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

/** Get a single owned goal by id. */
export const getMine = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    return goal;
  },
});

/** Create a new goal. */
export const create = mutation({
  args: {
    title: v.string(),
    story: v.optional(v.string()),
    category: v.string(),
    unit: v.string(),
    startValue: v.number(),
    targetValue: v.number(),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    targetDate: v.number(),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    if (!CATEGORIES.includes(args.category as (typeof CATEGORIES)[number])) {
      throw new Error("Invalid category");
    }
    if (args.title.trim().length === 0) throw new Error("Title is required");
    if (args.startValue === args.targetValue) {
      throw new Error("Start and target must differ");
    }
    if (
      args.direction === "decrease"
        ? args.targetValue >= args.startValue
        : args.targetValue <= args.startValue
    ) {
      throw new Error("Target is on the wrong side of start for the chosen direction");
    }
    if (args.targetDate <= Date.now()) {
      throw new Error("Target date must be in the future");
    }

    // Denormalize owner profile for fast public reads.
    const user = await ctx.db.get(userId);
    const ownerName =
      (user as { name?: string } | null)?.name ??
      (user as { email?: string } | null)?.email ??
      undefined;
    const ownerImage = (user as { image?: string } | null)?.image ?? undefined;

    let slug = buildSlug(args.title);
    for (let i = 0; i < 4; i++) {
      const existing = await ctx.db
        .query("goals")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = buildSlug(args.title);
    }

    const goalId = await ctx.db.insert("goals", {
      ownerId: userId,
      ownerName,
      ownerImage,
      title: args.title.trim(),
      story: args.story?.trim() || undefined,
      category: args.category,
      unit: args.unit,
      startValue: args.startValue,
      targetValue: args.targetValue,
      currentValue: args.startValue,
      direction: args.direction,
      targetDate: args.targetDate,
      slug,
      publicEnabled: true,
      coverImageId: args.coverImageId,
      createdAt: Date.now(),
    });

    return { goalId, slug };
  },
});

/** Update goal metadata including story and cover image. */
export const update = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    story: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    publicEnabled: v.optional(v.boolean()),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) {
      if (args.title.trim().length === 0) throw new Error("Title is required");
      patch.title = args.title.trim();
    }
    if (args.story !== undefined) {
      patch.story = args.story.trim() || undefined;
    }
    if (args.targetDate !== undefined) {
      patch.targetDate = args.targetDate;
    }
    if (args.publicEnabled !== undefined) {
      patch.publicEnabled = args.publicEnabled;
    }
    if (args.coverImageId !== undefined) {
      patch.coverImageId = args.coverImageId;
    }
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(args.goalId, patch);
  },
});

/** Delete a goal and its updates / reactions / badges. */
export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    for (const u of updates) await ctx.db.delete(u._id);

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    const badges = await ctx.db
      .query("badges")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    for (const b of badges) await ctx.db.delete(b._id);

    await ctx.db.delete(goalId);
  },
});

/**
 * Update a goal's measured value, record a "value"-typed update, and award new badges.
 */
export const recordValue = mutation({
  args: {
    goalId: v.id("goals"),
    value: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, value, note }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const now = Date.now();
    await ctx.db.insert("updates", {
      goalId,
      ownerId: userId,
      type: "value",
      value,
      note: note?.trim() || undefined,
      publicVisible: true,
      createdAt: now,
    });

    await ctx.db.patch(goalId, { currentValue: value });

    const pct = computeProgress(goal.startValue, value, goal.targetValue, goal.direction);
    const existingBadges = await ctx.db
      .query("badges")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const awarded = existingBadges.map((b) => b.tier);
    const newTiers = newMilestoneTiers(pct, awarded);
    for (const tier of newTiers) {
      await ctx.db.insert("badges", {
        goalId,
        ownerId: userId,
        tier,
        awardedAt: now,
      });
    }

    return { progress: pct, newBadges: newTiers };
  },
});
