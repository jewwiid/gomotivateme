import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Latest named achievements earned across the signed-in owner's goals. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("achievements")
      .withIndex("by_owner_awarded", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(12);

    return Promise.all(
      rows.map(async (achievement) => {
        const goal = await ctx.db.get(achievement.goalId);
        return {
          ...achievement,
          goalTitle: goal?.title ?? "Goal",
        };
      })
    );
  },
});
