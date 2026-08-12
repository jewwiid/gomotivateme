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
import { resolveAvatarUrl } from "./users";

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

/**
 * Seed users.displayName from the name currently on record.
 *
 * The auth library re-patches `name` from the OAuth profile on every sign-in,
 * so `displayName` is what makes a chosen name stick (auth.ts restores from it
 * after each sign-in). Users who set a name before that field existed have no
 * displayName, so their name would still revert on the next Google sign-in —
 * this pins whatever name they have today.
 *
 * Side effect worth knowing: once pinned, a later change to the user's Google
 * account name no longer flows through automatically. That's the intended
 * trade — the name a user sees on their profile should not change under them —
 * and they can still edit it in settings.
 *
 *   npx convex run --prod migrations:backfillDisplayNames \
 *     '{"cursor":null,"batchSize":100,"dryRun":true}'
 */
export const backfillDisplayNames = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const requestedBatchSize = args.batchSize ?? 100;
    const batchSize = Math.max(1, Math.min(500, Math.floor(requestedBatchSize)));
    const dryRun = args.dryRun ?? true;
    const page = await ctx.db.query("users").paginate({
      cursor: args.cursor,
      numItems: batchSize,
    });

    let patched = 0;
    let alreadySet = 0;
    let noName = 0;

    for (const user of page.page) {
      const name = (user as any).name;
      if ((user as any).displayName) {
        alreadySet += 1;
        continue;
      }
      if (!name) {
        // Never set a name — nothing to preserve. They'll get displayName the
        // first time they save their profile.
        noName += 1;
        continue;
      }
      patched += 1;
      if (!dryRun) await ctx.db.patch(user._id, { displayName: name });
    }

    return {
      dryRun,
      scanned: page.page.length,
      patched,
      alreadySet,
      noName,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Repair the denormalized owner snapshot on goals.
 *
 * setAvatar / removeAvatar used to update the user document without touching
 * the ownerName / ownerImage / ownerHandle copies each goal carries, so goals
 * created before a profile change kept serving the avatar and name that were
 * current at creation time. Public surfaces read those copies, which is why
 * the discovery feed, explore, search, and OG cards could all disagree with
 * the profile page.
 *
 * The forward fix is in users.syncOwnerSnapshot; this re-derives the snapshot
 * for rows written before it existed.
 *
 *   npx convex run --prod migrations:resyncGoalOwnerSnapshots \
 *     '{"cursor":null,"batchSize":100,"dryRun":true}'
 */
export const resyncGoalOwnerSnapshots = internalMutation({
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
    let skippedAnonymous = 0;
    let missingOwner = 0;
    const drift: Array<{ slug: string; field: string }> = [];

    // One lookup per owner rather than per goal — a user typically owns
    // several of the goals in a page.
    const ownerCache = new Map<string, any>();

    for (const goal of page.page) {
      // Anonymous goals have their owner fields stripped at read time; writing
      // real values back would defeat that.
      if (goal.isAnonymous) {
        skippedAnonymous += 1;
        continue;
      }

      let owner = ownerCache.get(goal.ownerId);
      if (owner === undefined) {
        owner = await ctx.db.get(goal.ownerId);
        ownerCache.set(goal.ownerId, owner);
      }
      if (!owner) {
        missingOwner += 1;
        continue;
      }

      const ownerName = owner.name ?? owner.email ?? undefined;
      const ownerImage = (await resolveAvatarUrl(ctx, owner)) ?? undefined;
      const ownerHandle = owner.handle ?? undefined;

      const patch: Record<string, unknown> = {};
      if (goal.ownerName !== ownerName) {
        patch.ownerName = ownerName;
        drift.push({ slug: goal.slug, field: "ownerName" });
      }
      if (goal.ownerImage !== ownerImage) {
        patch.ownerImage = ownerImage;
        drift.push({ slug: goal.slug, field: "ownerImage" });
      }
      if (goal.ownerHandle !== ownerHandle) {
        patch.ownerHandle = ownerHandle;
        drift.push({ slug: goal.slug, field: "ownerHandle" });
      }

      if (Object.keys(patch).length === 0) {
        alreadyCurrent += 1;
        continue;
      }

      patched += 1;
      if (!dryRun) await ctx.db.patch(goal._id, patch);
    }

    return {
      dryRun,
      scanned: page.page.length,
      patched,
      alreadyCurrent,
      skippedAnonymous,
      missingOwner,
      drift: drift.slice(0, 25),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
