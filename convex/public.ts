// @ts-nocheck — see convex/goals.ts header.
/**
 * Public read paths — used by the unauthenticated /o/[slug] page
 * and the discovery feed on the landing page.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { computeProgress, daysUntil } from "./utils";

// Existing goals predate moderation and remain visible. New/edited goals are
// only exposed once a decision has approved their public content.
function isModerationApproved(goal: any) {
  return !goal.moderationStatus || goal.moderationStatus === "approved";
}

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
    if (!isModerationApproved(goal)) return null;
    // Pre-launch goals (status: "draft") are not visible on the public page.
    // The creator manages them via the dashboard.
    if (goal.status === "draft") return null;

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

/** Fetch a goal by id (for the apply-to-motivate page). */
export const getGoalById = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return null;
    if (goal.visibility !== "public") return null;
    if (!isModerationApproved(goal)) return null;
    // Pre-launch goals are still public-readable for the apply page — the
    // widget on the public page is hidden but anyone with the direct link
    // (which the creator sends in invite flows) can land here.
    const progress = computeProgress(
      goal.startValue,
      goal.currentValue,
      goal.targetValue,
      goal.direction
    );
    return {
      _id: goal._id,
      slug: goal.slug,
      title: goal.title,
      summary: goal.summary,
      story: goal.story,
      category: goal.category,
      status: goal.status,
      visibility: goal.visibility,
      ownerId: goal.ownerId,
      ownerName: goal.ownerName,
      ownerImage: goal.ownerImage,
      publicMotivatorPolicy: goal.publicMotivatorPolicy,
      coreMotivatorMin: goal.coreMotivatorMin,
      preLaunchAt: goal.preLaunchAt,
      preLaunchDeadline: goal.preLaunchDeadline,
      coverImageId: goal.coverImageId,
      progress,
    };
  },
});

/** Recent public campaigns for the discovery feed. Filters out pre-launch + closed. */
export const listRecentPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 24;
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(take * 4);

    return goals
      .filter((g) => g.status !== "closed" && g.status !== "draft" && isModerationApproved(g))
      .slice(0, take)
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
    const take = limit ?? 24;
    const all = await ctx.db
      .query("goals")
      .withIndex("by_category_status", (q) => q.eq("category", category))
      .order("desc")
      .take(take * 4);
    return all
      .filter(
        (g) =>
          g.visibility === "public" && g.status !== "closed" && g.status !== "draft"
          && isModerationApproved(g)
      )
      .slice(0, take)
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

/**
 * Discover/search public goals. Optional query string does a case-insensitive
 * prefix match on title (cheap + predictable). Optional category narrows to one.
 * Returns goals ordered by recency. Used by the /explore page.
 */
export const searchPublicGoals = query({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, limit }) => {
    const take = limit ?? 60;
    const q = query?.trim().toLowerCase();

    // Pull a window of recent public goals and filter in-memory. At our
    // current scale (low hundreds of goals) this is fine. If traffic grows
    // we'd swap to the searchIndex + filterFields combo on the goals table.
    const recent = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (qq) => qq.eq("visibility", "public"))
      .order("desc")
      .take(Math.max(take, 200));

    return recent
      .filter(
        (g) =>
          g.status !== "closed" &&
          g.status !== "draft" &&
          isModerationApproved(g) &&
          (!category || g.category === category) &&
          (!q ||
            g.title.toLowerCase().includes(q) ||
            (g.summary ?? "").toLowerCase().includes(q) ||
            (g.ownerName ?? "").toLowerCase().includes(q))
      )
      .slice(0, take)
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
        ownerId: g.ownerId,
        ownerName: g.ownerName,
        ownerHandle: g.ownerHandle,
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

/**
 * Counts of public active goals per category, sorted descending. Used by
 * the Categories tab on /explore so visitors can see "Creative — 42" etc.
 */
export const countByCategory = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) => q.eq("visibility", "public"))
      .collect();
    const counts: Record<string, number> = {};
    for (const g of all) {
      if (g.status === "draft" || g.status === "closed" || !isModerationApproved(g)) continue;
      counts[g.category] = (counts[g.category] ?? 0) + 1;
    }
    return counts;
  },
});
