/**
 * Progress updates — notes, images, links, values, milestones.
 *
 * Value-type updates are written through `goals.recordValue` so badges stay
 * in sync; this file is the catch-all for the other four update kinds and
 * also exposes the read paths used by the public timeline + dashboard.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const updateType = v.union(
  v.literal("note"),
  v.literal("image"),
  v.literal("link"),
  v.literal("value"),
  v.literal("milestone")
);

/** Public: timeline of visible updates on a goal (newest first). */
export const listForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const all = await ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .collect();
    return all.filter((u) => u.publicVisible);
  },
});

/** Owner: every update on a goal, including hidden ones. */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .collect();
  },
});

/** Owner: add a new update to one of their goals. */
export const add = mutation({
  args: {
    goalId: v.id("goals"),
    type: updateType,
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    value: v.optional(v.number()),
    milestoneId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.ownerId !== userId) throw new Error("Not the goal owner");

    return ctx.db.insert("updates", {
      goalId: args.goalId,
      ownerId: userId,
      type: args.type,
      note: args.note,
      imageId: args.imageId,
      linkUrl: args.linkUrl,
      linkTitle: args.linkTitle,
      value: args.value,
      milestoneId: args.milestoneId,
      publicVisible: true,
      createdAt: Date.now(),
    });
  },
});

/** Owner: request a one-shot upload URL for a new image. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return ctx.storage.generateUploadUrl();
  },
});

/** Owner: hard-delete an update. */
export const remove = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const u = await ctx.db.get(updateId);
    if (!u) return;
    if (u.ownerId !== userId) throw new Error("Not the owner");
    await ctx.db.delete(updateId);
  },
});

/** Owner: soft-hide an update from the public timeline. */
export const hide = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const u = await ctx.db.get(updateId);
    if (!u) return;
    if (u.ownerId !== userId) throw new Error("Not the owner");
    await ctx.db.patch(updateId, { publicVisible: false });
  },
});
