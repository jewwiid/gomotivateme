// @ts-nocheck — see convex/goals.ts header.
/**
 * Public read paths — used by the unauthenticated /o/[slug] page
 * and the discovery feed on the landing page.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { computeProgress, daysUntil } from "./utils";

/** Fetch a public goal by slug, with computed progress + days remaining. */
export const getGoalBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!goal) return null;
    if (!goal.publicEnabled) return null;

    const progress = computeProgress(
      goal.startValue,
      goal.currentValue,
      goal.targetValue,
      goal.direction
    );
    const days = daysUntil(goal.targetDate, Date.now());

    return { ...goal, progress, daysRemaining: days };
  },
});

/** Recent public goals for the discovery feed. */
export const listRecentPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) => q.eq("publicEnabled", true))
      .order("desc")
      .take(limit ?? 12);

    return goals.map((g) => ({
      _id: g._id,
      slug: g.slug,
      title: g.title,
      category: g.category,
      unit: g.unit,
      startValue: g.startValue,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      direction: g.direction,
      targetDate: g.targetDate,
      coverImageId: g.coverImageId,
      createdAt: g.createdAt,
      ownerName: g.ownerName,
      ownerImage: g.ownerImage,
      progress: computeProgress(g.startValue, g.currentValue, g.targetValue, g.direction),
      daysRemaining: daysUntil(g.targetDate, Date.now()),
    }));
  },
});
