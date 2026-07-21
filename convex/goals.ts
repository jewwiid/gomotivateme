// @ts-nocheck — see convex/goals.ts header.
/**
 * Goal CRUD + lifecycle.
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
  "personal",
  "community",
  "adventure",
  "other",
] as const;

const SUPPORT_TYPES = [
  "encourage",
  "experience",
  "advice",
  "checkin",
  "join",
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

/** Create a new motivation campaign. */
export const create = mutation({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    category: v.string(),
    unit: v.string(),
    progressType: v.union(
      v.literal("number"),
      v.literal("streak"),
      v.literal("milestones")
    ),
    startValue: v.number(),
    targetValue: v.number(),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    targetDate: v.optional(v.number()),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
        })
      )
    ),
    supporterTarget: v.optional(v.number()),
    supportTypes: v.array(v.string()),
    visibility: v.union(v.literal("public"), v.literal("unlisted")),
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
    if (args.targetDate && args.targetDate <= Date.now()) {
      throw new Error("Target date must be in the future");
    }

    // Validate supportTypes
    const validSupport = args.supportTypes.filter((t) =>
      SUPPORT_TYPES.includes(t as (typeof SUPPORT_TYPES)[number])
    );

    // Build initial milestone rows (all undone).
    const milestones = (args.milestones ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      done: false,
    }));

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

    const now = Date.now();
    const goalId = await ctx.db.insert("goals", {
      ownerId: userId,
      ownerName,
      ownerImage,
      title: args.title.trim(),
      summary: args.summary?.trim() || undefined,
      story: args.story?.trim() || undefined,
      category: args.category,
      unit: args.unit,
      progressType: args.progressType,
      startValue: args.startValue,
      targetValue: args.targetValue,
      currentValue: args.startValue,
      direction: args.direction,
      targetDate: args.targetDate,
      milestones: milestones.length > 0 ? milestones : undefined,
      supporterTarget: args.supporterTarget,
      supporterCount: 0,
      supportTypes: validSupport as any,
      status: "active",
      visibility: args.visibility,
      slug,
      coverImageId: args.coverImageId,
      createdAt: now,
      updatedAt: now,
    });

    return { goalId, slug };
  },
});

/** Update goal metadata. */
export const update = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    supporterTarget: v.optional(v.number()),
    supportTypes: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"))),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      if (args.title.trim().length === 0) throw new Error("Title is required");
      patch.title = args.title.trim();
    }
    if (args.summary !== undefined) patch.summary = args.summary.trim() || undefined;
    if (args.story !== undefined) patch.story = args.story.trim() || undefined;
    if (args.targetDate !== undefined) patch.targetDate = args.targetDate;
    if (args.supporterTarget !== undefined) patch.supporterTarget = args.supporterTarget;
    if (args.supportTypes !== undefined) patch.supportTypes = args.supportTypes;
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.coverImageId !== undefined) patch.coverImageId = args.coverImageId;
    await ctx.db.patch(args.goalId, patch);
  },
});

/** Set the campaign's lifecycle status. */
export const setStatus = mutation({
  args: {
    goalId: v.id("goals"),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("closed")
    ),
    pausedReason: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, status, pausedReason }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const now = Date.now();
    const patch: Record<string, unknown> = { status, updatedAt: now };
    if (status === "paused") {
      patch.pausedReason = pausedReason ?? "Taking a break";
    } else if (status === "active") {
      patch.pausedReason = undefined;
    } else if (status === "completed") {
      patch.completedAt = now;
    }
    await ctx.db.patch(goalId, patch);
  },
});

/** Toggle a milestone's done state (milestone-template goals only). */
export const toggleMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    milestoneId: v.string(),
    done: v.boolean(),
  },
  handler: async (ctx, { goalId, milestoneId, done }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.progressType !== "milestones") throw new Error("Not a milestone goal");
    if (!goal.milestones) throw new Error("No milestones on this goal");

    const milestones = goal.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, done, completedAt: done ? Date.now() : undefined }
        : m
    );
    const completedCount = milestones.filter((m) => m.done).length;
    const pct =
      goal.milestones.length > 0
        ? (completedCount / goal.milestones.length) * 100
        : 0;

    await ctx.db.patch(goalId, {
      milestones,
      currentValue: completedCount,
      updatedAt: Date.now(),
    });

    // Award milestone badges
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
        awardedAt: Date.now(),
      });
    }
    return { progress: pct, newBadges: newTiers };
  },
});

/** Delete a goal and its associated rows. */
export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    for (const table of ["updates", "reactions", "badges", "supporters", "supportMessages"] as const) {
      const rows = await ctx.db
        .query(table as any)
        .withIndex("by_goal" as any, (q: any) => q.eq("goalId", goalId))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    await ctx.db.delete(goalId);
  },
});

/**
 * Record a new measured value (number-template goals) or log a streak day.
 * Awards milestone badges when crossing 25/50/75/100.
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
    if (goal.status !== "active") throw new Error("This goal isn't active");

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
    await ctx.db.patch(goalId, { currentValue: value, updatedAt: now });

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
