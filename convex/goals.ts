// @ts-nocheck — see convex/goals.ts header.
/**
 * Goal CRUD + lifecycle.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildSlug, computeProgress, newMilestoneTiers } from "./utils";

const CATEGORIES = [
  "health",
  "learning",
  "career",
  "launch",
  "creative",
  "habit",
  "sports",
  "community",
  "personal",
  "travel",
  "family",
  "faith",
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
    startValue: v.optional(v.number()),
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

    // --- Motivation Circle ---
    publicMotivatorPolicy: v.optional(
      v.union(v.literal("auto"), v.literal("approval"), v.literal("disabled"))
    ),
    coreMotivatorMin: v.optional(v.number()),
    invites: v.optional(
      v.array(
        v.object({
          name: v.string(),
          email: v.optional(v.string()),
          proposedRole: v.union(
            v.literal("encourager"),
            v.literal("accountability"),
            v.literal("advice"),
            v.literal("review"),
            v.literal("challenge")
          ),
          proposedFrequency: v.union(
            v.literal("afterUpdate"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("onRequest")
          ),
          personalMessage: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    if (!CATEGORIES.includes(args.category as (typeof CATEGORIES)[number])) {
      throw new Error("Invalid category");
    }
    const category = args.category;

    if (args.title.trim().length === 0) throw new Error("Title is required");
    if (args.targetDate && args.targetDate <= Date.now()) {
      throw new Error("Target date must be in the future");
    }

    // --- Server-side coercion based on progress type ---
    // Prevents NaN, enforces sane defaults regardless of what the client sends.
    let startValue: number;
    let currentValue: number;
    let targetValue: number;
    let direction: "increase" | "decrease";
    let unit: string;

    if (args.progressType === "milestones") {
      startValue = 0;
      currentValue = 0;
      targetValue = (args.milestones ?? []).length;
      direction = "increase";
      unit = "milestones";
    } else if (args.progressType === "streak") {
      startValue = 0;
      currentValue = 0;
      targetValue = args.targetValue;
      direction = "increase";
      unit = "days";
    } else {
      // "number" — validate client-supplied values
      startValue = args.startValue ?? 0;
      targetValue = args.targetValue;
      currentValue = startValue;
      direction = args.direction;
      unit = args.unit;
      if (startValue === targetValue) {
        throw new Error("Start and target must differ");
      }
      if (
        direction === "decrease"
          ? targetValue >= startValue
          : targetValue <= startValue
      ) {
        throw new Error("Target is on the wrong side of start for the chosen direction");
      }
    }

    // Validate supportTypes
    const validSupport = args.supportTypes.filter((t) =>
      SUPPORT_TYPES.includes(t as (typeof SUPPORT_TYPES)[number])
    );

    // Cap invites at 6 — that's the circle size from the spec.
    const invites = (args.invites ?? []).slice(0, 6);
    const hasInvites = invites.length > 0;
    const preLaunchDeadline = hasInvites ? Date.now() + 14 * 24 * 60 * 60 * 1000 : undefined;

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
      category,
      unit,
      progressType: args.progressType,
      startValue,
      targetValue,
      currentValue,
      direction,
      targetDate: args.targetDate,
      milestones: milestones.length > 0 ? milestones : undefined,
      supporterTarget: args.supporterTarget,
      supporterCount: 0,
      supportTypes: validSupport as any,
      status: hasInvites ? "draft" : "active",
      visibility: args.visibility,
      slug,
      coverImageId: args.coverImageId,
      moderationStatus: "pending",
      createdAt: now,
      updatedAt: now,
      // --- Motivation Circle ---
      publicMotivatorPolicy: args.publicMotivatorPolicy ?? "approval",
      coreMotivatorMin: args.coreMotivatorMin ?? 3,
      preLaunchAt: hasInvites ? now : undefined,
      preLaunchDeadline,
    });

    // If we have invites, create the invite rows now. The token is random
    // enough to make guessing impractical. Recipients get the link via the
    // share sheet on the dashboard.
    if (invites.length > 0) {
      for (const inv of invites) {
        const token =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await ctx.db.insert("motivatorInvites", {
          goalId,
          creatorId: userId,
          name: inv.name.trim(),
          email: inv.email?.trim() || undefined,
          invitedUserId: undefined,
          proposedRole: inv.proposedRole,
          proposedFrequency: inv.proposedFrequency,
          personalMessage: inv.personalMessage?.trim() || undefined,
          token,
          status: "pending",
          goalTitle: args.title.trim(),
          createdAt: now,
          expiresAt: preLaunchDeadline ?? now + 14 * 24 * 60 * 60 * 1000,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.moderation.reviewGoal, { goalId });

    // Email B8 — "Your goal is live" (transactional confirmation). Same
    // pattern as the welcome email in users.ts. Transactional because it's
    // a service message about an action the user just took, not marketing
    // (CAN-SPAM exempts it, so unsubscribe prefs don't apply).
    const ownerEmail = (user as { email?: string } | null)?.email;
    if (ownerEmail) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId,
        toEmail: ownerEmail,
        templateId: "goalCreated",
        category: "transactional",
        payload: JSON.stringify({
          firstName: ownerName?.split(" ")[0],
          goalTitle: args.title.trim(),
          slug,
        }),
      });
    }

    return { goalId, slug };
  },
});

/**
 * Launch a pre-launch goal.
 * Allowed when:
 *   - core motivators >= coreMotivatorMin, OR
 *   - the pre-launch deadline has passed
 * Sets status → "active" and stamps launchedAt. The goal becomes discoverable
 * on the public feed from this point.
 */
export const launch = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.status !== "draft") throw new Error("Goal is not in pre-launch");

    const now = Date.now();
    const deadlinePassed =
      goal.preLaunchDeadline !== undefined && goal.preLaunchDeadline <= now;

    // Count active core motivators
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const activeCore = pledges.filter(
      (p) => p.isCoreMotivator && p.status === "active"
    ).length;

    if (!deadlinePassed && activeCore < goal.coreMotivatorMin) {
      throw new Error(
        `Need ${goal.coreMotivatorMin - activeCore} more core motivators to launch (or wait until ${new Date(goal.preLaunchDeadline ?? now).toLocaleDateString()})`
      );
    }

    await ctx.db.patch(goalId, {
      status: "active",
      launchedAt: now,
      updatedAt: now,
    });
    return { launched: true, activeCoreMotivators: activeCore };
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
    publicMotivatorPolicy: v.optional(
      v.union(v.literal("auto"), v.literal("approval"), v.literal("disabled"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const needsModeration =
      args.title !== undefined ||
      args.summary !== undefined ||
      args.story !== undefined ||
      args.coverImageId !== undefined;
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
    if (args.publicMotivatorPolicy !== undefined) {
      patch.publicMotivatorPolicy = args.publicMotivatorPolicy;
    }
    if (args.coverImageId !== undefined) patch.coverImageId = args.coverImageId;
    if (needsModeration) {
      patch.moderationStatus = "pending";
      patch.moderationReason = undefined;
      patch.moderationCategories = undefined;
      patch.moderatedAt = undefined;
    }
    await ctx.db.patch(args.goalId, patch);
    if (needsModeration) {
      await ctx.scheduler.runAfter(0, internal.moderation.reviewGoal, { goalId: args.goalId });
    }
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

    // Mirror the completion into the `updates` table so the public
    // journey timeline (EditorialTimeline) actually reflects the
    // milestone tick. We only fire on `done === true` (not on un-toggles
    // — those would be confusing "I un-finished X" entries), and we
    // auto-publish because a milestone toggle is a low-risk, owner-
    // initiated binary event. The moderation pipeline is designed for
    // free-form text/images/links, not self-reported checklists.
    if (done) {
      const ms = goal.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        await ctx.db.insert("updates", {
          goalId,
          ownerId: userId,
          type: "milestone",
          milestoneId,
          note: ms.title,
          moderationStatus: "approved",
          publicVisible: true,
          createdAt: Date.now(),
        });
      }
    }

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

    const mediaUpdates = await ctx.db
      .query("updates")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    for (const update of mediaUpdates) {
      const storageIds = new Set();
      for (const item of update.media ?? []) {
        if (item.kind === "image") {
          if (item.storageId) storageIds.add(item.storageId);
          if (item.thumbnailId) storageIds.add(item.thumbnailId);
        }
      }
      for (const storageId of storageIds) await ctx.storage.delete(storageId);
      await ctx.db.delete(update._id);
    }

    if (goal.coverImageId) await ctx.storage.delete(goal.coverImageId);

    const pendingUploads = await ctx.db
      .query("mediaUploadIntents")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const intent of pendingUploads) {
      if (intent.goalId === goalId) await ctx.db.delete(intent._id);
    }

    for (const table of ["reactions", "badges", "supporters", "supportMessages"] as const) {
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
    const updateId = await ctx.db.insert("updates", {
      goalId,
      ownerId: userId,
      type: "value",
      value,
      note: note?.trim() || undefined,
      moderationStatus: note?.trim() ? "pending" : "approved",
      publicVisible: !note?.trim(),
      createdAt: now,
    });
    if (note?.trim()) {
      await ctx.scheduler.runAfter(0, internal.moderation.reviewUpdate, { updateId });
    }
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
