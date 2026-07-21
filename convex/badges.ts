/**
 * Badges — milestone awards (25%, 50%, 75%, 100%).
 *
 * Written by `goals.recordValue`; this file exposes the read paths used by
 * the public goal page and the dashboard.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";

/** Public: every badge earned on a goal. */
export const listForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    return ctx.db
      .query("badges")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
  },
});
