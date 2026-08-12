/**
 * Bounded, repeatable data migrations.
 *
 * Run a dry pass before the write pass:
 *   npx convex run --prod migrations:backfillGoalMeasurements \
 *     '{"cursor":null,"batchSize":100,"dryRun":true}'
 */
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  MEASUREMENT_VERSION,
  getMeasurementMetric,
  inferMeasurementMetric,
} from "../lib/goalMeasurementCatalog";

export const backfillGoalMeasurements = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const requestedBatchSize = args.batchSize ?? 100;
    const batchSize = Math.max(1, Math.min(500, Math.floor(requestedBatchSize)));
    const dryRun = args.dryRun ?? true;
    const page = await ctx.db.query("goals").paginate({
      cursor: args.cursor,
      numItems: batchSize,
    });

    let patched = 0;
    let alreadyCurrent = 0;
    let unresolved = 0;
    const assignments: Record<string, number> = {};

    for (const goal of page.page) {
      const existing = getMeasurementMetric(goal.category, goal.metricId);
      const inferred =
        existing ??
        inferMeasurementMetric(
          goal.category,
          goal.progressType,
          goal.unit,
          goal.direction
        );

      if (!inferred) {
        unresolved += 1;
        continue;
      }

      assignments[inferred.id] = (assignments[inferred.id] ?? 0) + 1;
      if (
        goal.metricId === inferred.id &&
        goal.measurementVersion === MEASUREMENT_VERSION
      ) {
        alreadyCurrent += 1;
        continue;
      }

      patched += 1;
      if (!dryRun) {
        await ctx.db.patch(goal._id, {
          metricId: inferred.id,
          measurementVersion: MEASUREMENT_VERSION,
        });
      }
    }

    return {
      dryRun,
      scanned: page.page.length,
      patched,
      alreadyCurrent,
      unresolved,
      assignments,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
