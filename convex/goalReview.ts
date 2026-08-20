import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { reviewGoal } from "./lib/goalRisk";

const blockerValidator = v.union(
  v.literal("time"),
  v.literal("motivation"),
  v.literal("too_big"),
  v.literal("unclear"),
  v.literal("outside_control"),
  v.literal("other")
);

const signalValidator = v.object({
  id: v.string(),
  severity: v.union(v.literal("warn"), v.literal("high")),
  title: v.string(),
  detail: v.string(),
  blocker: blockerValidator,
});

const EMPTY = {
  signals: [],
  primaryBlocker: null,
  quietDays: 0,
  progressFraction: 0,
};

/**
 * Owner-only risk review for one goal. Deterministic and free — no model is called,
 * so this can be read on every dashboard visit without touching the AI budget. The
 * AI is invoked only afterwards, when the owner asks for a recovery plan.
 *
 * `now` is an argument rather than a server clock read because a Convex query is
 * cached against its arguments: reading the clock inside would freeze the result
 * until some row changed, and a goal going quiet is precisely the case where no row
 * changes. Callers pass a value rounded to the hour so the query is stable.
 */
export const review = query({
  args: { goalId: v.id("goals"), now: v.number() },
  returns: v.object({
    signals: v.array(signalValidator),
    primaryBlocker: v.union(blockerValidator, v.null()),
    quietDays: v.number(),
    progressFraction: v.number(),
  }),
  handler: async (ctx, { goalId, now }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return EMPTY;

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return EMPTY;

    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .take(40);

    return reviewGoal(
      {
        status: goal.status,
        progressType: goal.progressType,
        direction: goal.direction,
        startValue: goal.startValue ?? null,
        currentValue: goal.currentValue ?? null,
        targetValue: goal.targetValue,
        targetDate: goal.targetDate ?? null,
        createdAt: goal.createdAt,
        launchedAt: goal.launchedAt ?? null,
        milestones: (goal.milestones ?? []).map((milestone) => ({
          done: milestone.done,
          completedAt: milestone.completedAt ?? null,
        })),
        updates: updates
          .filter((update) => !update.revertedAt)
          .map((update) => ({ createdAt: update.createdAt })),
      },
      now
    );
  },
});
