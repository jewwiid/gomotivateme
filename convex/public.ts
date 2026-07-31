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

/**
 * Strip owner identity from a goal for public consumption when the goal is
 * anonymous. The real denormalized fields stay in the DB for the dashboard
 * and email fan-out; this replaces name/avatar with neutral values at read
 * time. ownerHandle is kept so URL routing (/o/[handle]/[slug]) still works,
 * but the frontend should not render it as a profile link.
 */
function stripOwnerIfAnonymous(goal: any) {
  if (goal.isAnonymous) {
    return {
      ...goal,
      ownerName: "Anonymous",
      ownerImage: undefined,
      ownerId: undefined,
    };
  }
  return goal;
}

/**
 * Fetch a public goal by owner handle + slug (namespaced URL
 * /o/[handle]/[slug]), with computed progress + days remaining.
 */
export const getGoalByHandleAndSlug = query({
  args: { handle: v.string(), slug: v.string() },
  handler: async (ctx, { handle, slug }) => {
    const normalized = handle.toLowerCase().trim();
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_handle_slug", (q) =>
        q.eq("ownerHandle", normalized).eq("slug", slug)
      )
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

    return { ...stripOwnerIfAnonymous(goal), progress, daysRemaining: days };
  },
});

/**
 * @deprecated Backward-compat wrapper for old /o/[slug] URLs. Queries by slug
 * only via the legacy `by_slug` index. Used by redirect logic during the
 * migration to namespaced /o/[handle]/[slug] URLs. Prefer
 * `getGoalByHandleAndSlug` for new code.
 */
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
    if (goal.status === "draft") return null;

    const progress = computeProgress(
      goal.startValue,
      goal.currentValue,
      goal.targetValue,
      goal.direction
    );
    const days = goal.targetDate ? daysUntil(goal.targetDate, Date.now()) : null;

    return { ...stripOwnerIfAnonymous(goal), progress, daysRemaining: days };
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
      ownerHandle: goal.ownerHandle,
      title: goal.title,
      summary: goal.summary,
      story: goal.story,
      category: goal.category,
      status: goal.status,
      visibility: goal.visibility,
      ownerId: goal.isAnonymous ? undefined : goal.ownerId,
      ownerName: goal.isAnonymous ? "Anonymous" : goal.ownerName,
      ownerImage: goal.isAnonymous ? undefined : goal.ownerImage,
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
      .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(take * 4);

    return goals
      .filter((g) => g.status !== "closed" && g.status !== "draft" && isModerationApproved(g))
      .slice(0, take)
      .map((g) => {
        const stripped = stripOwnerIfAnonymous(g);
        return {
        _id: stripped._id,
        slug: stripped.slug,
        ownerHandle: stripped.ownerHandle,
        title: stripped.title,
        summary: stripped.summary,
        category: stripped.category,
        unit: stripped.unit,
        startValue: stripped.startValue,
        targetValue: stripped.targetValue,
        currentValue: stripped.currentValue,
        direction: stripped.direction,
        targetDate: stripped.targetDate,
        coverImageId: stripped.coverImageId,
        createdAt: stripped.createdAt,
        ownerName: stripped.ownerName,
        ownerImage: stripped.ownerImage,
        supporterTarget: stripped.supporterTarget,
        supporterCount: stripped.supporterCount,
        progressType: stripped.progressType,
        supportTypes: stripped.supportTypes,
        status: stripped.status,
        progress: computeProgress(stripped.startValue, stripped.currentValue, stripped.targetValue, stripped.direction),
        daysRemaining: stripped.targetDate ? daysUntil(stripped.targetDate, Date.now()) : null,
        };
      });
  },
});

/** List public campaigns by category. */
export const listByCategory = query({
  args: { category: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { category, limit }) => {
    const take = limit ?? 24;
    const all = await ctx.db
      .query("goals")
      .withIndex("by_category_created", (q) => q.eq("category", category))
      .order("desc")
      .take(take * 4);
    return all
      .filter(
        (g) =>
          g.visibility === "public" && g.status !== "closed" && g.status !== "draft"
          && isModerationApproved(g)
      )
      .slice(0, take)
      .map((g) => {
        const stripped = stripOwnerIfAnonymous(g);
        return {
        _id: stripped._id,
        slug: stripped.slug,
        ownerHandle: stripped.ownerHandle,
        title: stripped.title,
        summary: stripped.summary,
        currentValue: stripped.currentValue,
        targetValue: stripped.targetValue,
        unit: stripped.unit,
        direction: stripped.direction,
        coverImageId: stripped.coverImageId,
        supporterCount: stripped.supporterCount,
        supporterTarget: stripped.supporterTarget,
        progress: computeProgress(stripped.startValue, stripped.currentValue, stripped.targetValue, stripped.direction),
        status: stripped.status,
        };
      });
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
      .withIndex("by_visibility_created", (qq) => qq.eq("visibility", "public"))
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
            (g.isAnonymous ? false : (g.ownerName ?? "").toLowerCase().includes(q)))
      )
      .slice(0, take)
      .map((g) => {
        const stripped = stripOwnerIfAnonymous(g);
        return {
        _id: stripped._id,
        slug: stripped.slug,
        title: stripped.title,
        summary: stripped.summary,
        category: stripped.category,
        unit: stripped.unit,
        startValue: stripped.startValue,
        targetValue: stripped.targetValue,
        currentValue: stripped.currentValue,
        direction: stripped.direction,
        targetDate: stripped.targetDate,
        coverImageId: stripped.coverImageId,
        createdAt: stripped.createdAt,
        ownerId: stripped.ownerId,
        ownerName: stripped.ownerName,
        ownerHandle: stripped.ownerHandle,
        ownerImage: stripped.ownerImage,
        supporterTarget: stripped.supporterTarget,
        supporterCount: stripped.supporterCount,
        progressType: stripped.progressType,
        supportTypes: stripped.supportTypes,
        status: stripped.status,
        progress: computeProgress(stripped.startValue, stripped.currentValue, stripped.targetValue, stripped.direction),
        daysRemaining: stripped.targetDate ? daysUntil(stripped.targetDate, Date.now()) : null,
        };
      });
  },
});

/**
 * Counts of public active goals per category, sorted descending. Used by
 * the Categories tab on /explore so visitors can see "Creative — 42" etc.
 */
export const countByCategory = query({
  args: {},
  handler: async (ctx) => {
    // Bounded scan over the most recent public goals. An unbounded
    // `.collect()` reads every public goal on every /explore load and would
    // eventually exceed Convex's per-query read limit. Counts therefore
    // reflect the newest CATEGORY_COUNT_WINDOW goals, which is what the
    // Categories tab is for; exact lifetime totals would need a maintained
    // counter table.
    const CATEGORY_COUNT_WINDOW = 1000;
    const all = await ctx.db
      .query("goals")
      .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(CATEGORY_COUNT_WINDOW);
    const counts: Record<string, number> = {};
    for (const g of all) {
      if (g.status === "draft" || g.status === "closed" || !isModerationApproved(g)) continue;
      counts[g.category] = (counts[g.category] ?? 0) + 1;
    }
    return counts;
  },
});
// force redeploy Fri Jul 24 09:13:12 IST 2026
