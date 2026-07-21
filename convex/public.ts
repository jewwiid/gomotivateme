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
    if (goal.visibility !== "public") return null;

    const progress = computeProgress(
      goal.startValue,
      goal.currentValue,
      goal.targetValue,
      goal.direction
    );
    const days = goal.targetDate ? daysUntil(goal.targetDate, Date.now()) : null;

    return { ...goal, progress, daysRemaining: days };
  },
});

/** Recent public campaigns for the discovery feed. Filters out "closed". */
export const listRecentPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit ?? 24);

    return goals
      .filter((g) => g.status !== "closed")
      .map((g) => ({
        _id: g._id,
        slug: g.slug,
        title: g.title,
        summary: g.summary,
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
        supporterTarget: g.supporterTarget,
        supporterCount: g.supporterCount,
        progressType: g.progressType,
        supportTypes: g.supportTypes,
        status: g.status,
        progress: computeProgress(g.startValue, g.currentValue, g.targetValue, g.direction),
        daysRemaining: g.targetDate ? daysUntil(g.targetDate, Date.now()) : null,
      }));
  },
});

/** List public campaigns by category. */
export const listByCategory = query({
  args: { category: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { category, limit }) => {
    const all = await ctx.db
      .query("goals")
      .withIndex("by_category_status", (q) => q.eq("category", category))
      .order("desc")
      .take(limit ?? 24);
    return all
      .filter((g) => g.visibility === "public" && g.status !== "closed")
      .map((g) => ({
        _id: g._id,
        slug: g.slug,
        title: g.title,
        summary: g.summary,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit,
        direction: g.direction,
        coverImageId: g.coverImageId,
        supporterCount: g.supporterCount,
        supporterTarget: g.supporterTarget,
        progress: computeProgress(g.startValue, g.currentValue, g.targetValue, g.direction),
        status: g.status,
      }));
  },
});
