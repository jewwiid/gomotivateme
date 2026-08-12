// @ts-nocheck — see convex/goals.ts header.
/**
 * Goal CRUD + lifecycle.
 */
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildSlug, computeProgress, newMilestoneTiers } from "./utils";
import {
  MEASUREMENT_VERSION,
  getMeasurementMetric,
  inferMeasurementMetric,
  measurementAllowsUnit,
} from "../lib/goalMeasurementCatalog";

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

const DAY_MS = 86_400_000;
const STREAK_ACHIEVEMENTS = [
  { value: 1, title: "First day", description: "You showed up and started the streak." },
  { value: 3, title: "Momentum", description: "Three days in a row." },
  { value: 7, title: "One week strong", description: "Seven consecutive days of progress." },
  { value: 14, title: "In rhythm", description: "Two weeks without missing a day." },
  { value: 30, title: "A real habit", description: "Thirty consecutive days of progress." },
  { value: 60, title: "Built to last", description: "Sixty days of consistent effort." },
  { value: 100, title: "Century streak", description: "One hundred consecutive days." },
  { value: 365, title: "A year of showing up", description: "A full year, one day at a time." },
] as const;

function safeTimezoneOffset(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-840, Math.min(840, Math.round(value ?? 0)));
}

/** Date key in the browser convention where positive offsets are behind UTC. */
function localDayKey(timestamp: number, offsetMinutes: number) {
  return new Date(timestamp - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function withEffectiveStreak<T extends Record<string, any>>(goal: T): T {
  if (goal.progressType !== "streak" || !goal.streakLastLoggedDay) return goal;
  const offset = safeTimezoneOffset(goal.streakTimezoneOffsetMinutes);
  const today = localDayKey(Date.now(), offset);
  const yesterday = localDayKey(Date.now() - DAY_MS, offset);
  if (goal.streakLastLoggedDay === today || goal.streakLastLoggedDay === yesterday) {
    return goal;
  }
  return { ...goal, currentValue: 0, streakIsBroken: true };
}

/** List the owner's goals (dashboard). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
    return goals.map(withEffectiveStreak);
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
    return withEffectiveStreak(goal);
  },
});

/** Create a new motivation campaign. */
export const create = mutation({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    category: v.string(),
    metricId: v.optional(v.string()),
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
    tzOffsetMinutes: v.optional(v.number()),
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
    visibility: v.union(v.literal("public"), v.literal("unlisted"), v.literal("private")),
    isAnonymous: v.optional(v.boolean()),
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
    const selectedMeasurement = args.metricId
      ? getMeasurementMetric(category, args.metricId)
      : inferMeasurementMetric(category, args.progressType, args.unit, args.direction);
    if (!selectedMeasurement) {
      throw new Error("Choose a measurement that belongs to this goal category");
    }
    if (selectedMeasurement.progressType !== args.progressType) {
      throw new Error("That measurement does not match the selected progress style");
    }

    const cleanTitle = args.title.trim();
    const cleanSummary = args.summary?.trim() || undefined;
    const cleanStory = args.story?.trim() || undefined;
    if (cleanTitle.length === 0) throw new Error("Title is required");
    if (cleanTitle.length > 120) throw new Error("Titles can be up to 120 characters");
    if (cleanSummary && cleanSummary.length > 280) {
      throw new Error("Summaries can be up to 280 characters");
    }
    if (cleanStory && cleanStory.length > 3_000) {
      throw new Error("Stories can be up to 3,000 characters");
    }
    if ((args.milestones?.length ?? 0) > 8) {
      throw new Error("Use up to 8 milestones");
    }
    if (args.milestones?.some((milestone) => milestone.title.trim().length > 120)) {
      throw new Error("Milestones can be up to 120 characters");
    }
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
      if ((args.milestones?.length ?? 0) === 0) {
        throw new Error("Add at least one milestone");
      }
      startValue = 0;
      currentValue = 0;
      targetValue = (args.milestones ?? []).length;
      direction = "increase";
      unit = "milestones";
    } else if (args.progressType === "streak") {
      if (!Number.isInteger(args.targetValue) || args.targetValue <= 0) {
        throw new Error("Streak targets must be a positive number of days");
      }
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
      unit = args.unit.trim();
      if (!Number.isFinite(startValue) || !Number.isFinite(targetValue)) {
        throw new Error("Starting and target values must be valid numbers");
      }
      if (!unit || unit.length > 40) {
        throw new Error("Choose a valid unit");
      }
      if (!selectedMeasurement.directions.includes(direction)) {
        throw new Error("That direction does not fit the selected measurement");
      }
      if (!measurementAllowsUnit(selectedMeasurement, unit)) {
        throw new Error("That unit does not fit the selected measurement");
      }
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
      title: m.title.trim(),
      done: false,
    }));

    // Denormalize owner profile for fast public reads.
    const user = await ctx.db.get(userId);
    const ownerName =
      (user as { name?: string } | null)?.name ??
      (user as { email?: string } | null)?.email ??
      undefined;
    const ownerImage = (user as { image?: string } | null)?.image ?? undefined;
    const ownerHandle = (user as { handle?: string } | null)?.handle ?? undefined;

    // Slugs are namespaced per owner. If the user has no handle yet, fall
    // back to the ownerId string as the namespace key so collision checks
    // still scope correctly (the slug will be re-namespaced once a handle is
    // set, via the ownerHandle sync in users.updateProfile / setHandle).
    const namespaceKey = ownerHandle ?? userId;

    let slug = buildSlug(cleanTitle);
    // Per-owner uniqueness: append -2, -3, -4 ... on collision instead of
    // regenerating a random suffix.
    let suffix = 2;
    for (;;) {
      const existing = await ctx.db
        .query("goals")
        .withIndex("by_handle_slug", (q) =>
          q.eq("ownerHandle", namespaceKey).eq("slug", slug)
        )
        .first();
      if (!existing) break;
      slug = `${buildSlug(cleanTitle)}-${suffix}`;
      suffix++;
      if (suffix > 100) break; // safety valve
    }

    const now = Date.now();
    const goalId = await ctx.db.insert("goals", {
      ownerId: userId,
      ownerName,
      ownerImage,
      ownerHandle,
      title: cleanTitle,
      summary: cleanSummary,
      story: cleanStory,
      category,
      metricId: selectedMeasurement.id,
      measurementVersion: MEASUREMENT_VERSION,
      unit,
      progressType: args.progressType,
      startValue,
      targetValue,
      currentValue,
      direction,
      targetDate: args.targetDate,
      streakTimezoneOffsetMinutes:
        args.progressType === "streak"
          ? safeTimezoneOffset(args.tzOffsetMinutes)
          : undefined,
      streakReminderHour: args.progressType === "streak" ? 19 : undefined,
      milestones: milestones.length > 0 ? milestones : undefined,
      supporterTarget: args.supporterTarget,
      supporterCount: 0,
      supportTypes: validSupport as any,
      status: hasInvites ? "draft" : "active",
      visibility: args.visibility,
      isAnonymous: args.isAnonymous ?? false,
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
          goalTitle: cleanTitle,
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
        category: "lifecycle",
        preferenceKey: "accountActivity",
        payload: JSON.stringify({
          firstName: ownerName?.split(" ")[0],
          goalTitle: cleanTitle,
          slug,
          ownerHandle: (user as { handle?: string } | null)?.handle,
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
    clearTargetDate: v.optional(v.boolean()),
    supporterTarget: v.optional(v.number()),
    supportTypes: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))),
    isAnonymous: v.optional(v.boolean()),
    coverImageId: v.optional(v.id("_storage")),
    targetValue: v.optional(v.number()),
    startValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    direction: v.optional(v.union(v.literal("increase"), v.literal("decrease"))),
    publicMotivatorPolicy: v.optional(
      v.union(v.literal("auto"), v.literal("approval"), v.literal("disabled"))
    ),
    /** Optional: sync denormalized ownerHandle (used by handle-change flows). */
    ownerHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    // Once a goal has traction (supporters or progress logged), the contract
    // fields are locked — supporters signed up for a specific metric. Changing
    // targetValue / startValue / unit / direction / progressType mid-run would
    // invalidate the commitment. Owners should close the goal and start a new one.
    // "Progress logged" means the value has actually moved off its starting
    // point — not merely that it's non-zero. `create` seeds
    // `currentValue = startValue`, so a `> 0` test locks every goal with a
    // non-zero start (weight loss 100 → 80, "5 books → 50") the instant it's
    // created, leaving the owner unable to correct a typo.
    const hasProgress =
      (goal.currentValue ?? 0) !== (goal.startValue ?? 0);
    const hasTraction = (goal.supporterCount ?? 0) > 0 || hasProgress;
    const lockedFields: string[] = [];
    if (hasTraction) {
      if (args.targetValue !== undefined && args.targetValue !== goal.targetValue)
        lockedFields.push("targetValue");
      if (args.startValue !== undefined && args.startValue !== goal.startValue)
        lockedFields.push("startValue");
      if (args.unit !== undefined && args.unit !== goal.unit)
        lockedFields.push("unit");
      if (args.direction !== undefined && args.direction !== goal.direction)
        lockedFields.push("direction");
    }
    if (lockedFields.length > 0) {
      throw new Error(
        `Cannot change ${lockedFields.join(", ")} after supporters have joined or progress has been logged. Close this goal and create a new one instead.`
      );
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const needsModeration =
      args.title !== undefined ||
      args.summary !== undefined ||
      args.story !== undefined ||
      args.coverImageId !== undefined;
    if (args.title !== undefined) {
      const cleanTitle = args.title.trim();
      if (cleanTitle.length === 0) throw new Error("Title is required");
      if (cleanTitle.length > 120) {
        throw new Error("Titles can be up to 120 characters");
      }
      patch.title = cleanTitle;
    }
    if (args.summary !== undefined) {
      const cleanSummary = args.summary.trim();
      if (cleanSummary.length > 280) {
        throw new Error("Summaries can be up to 280 characters");
      }
      patch.summary = cleanSummary || undefined;
    }
    if (args.story !== undefined) {
      const cleanStory = args.story.trim();
      if (cleanStory.length > 3_000) {
        throw new Error("Stories can be up to 3,000 characters");
      }
      patch.story = cleanStory || undefined;
    }
    if (args.targetDate !== undefined && args.clearTargetDate) {
      throw new Error("Choose a target date or remove it, not both");
    }
    if (args.targetDate !== undefined) {
      patch.targetDate = args.targetDate;
      patch.lastDeadlineWarningAt = undefined;
      patch.deadlinePassedNotified = undefined;
    } else if (args.clearTargetDate) {
      patch.targetDate = undefined;
      patch.lastDeadlineWarningAt = undefined;
      patch.deadlinePassedNotified = undefined;
    }
    if (args.supporterTarget !== undefined) patch.supporterTarget = args.supporterTarget;
    if (args.supportTypes !== undefined) {
      // `create` filters these against the allowlist; without the same filter
      // here an unknown chip reaches the schema validator and surfaces as a
      // raw Convex error instead of a clean rejection.
      patch.supportTypes = args.supportTypes.filter((t) =>
        SUPPORT_TYPES.includes(t as (typeof SUPPORT_TYPES)[number])
      );
    }
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.isAnonymous !== undefined) patch.isAnonymous = args.isAnonymous;
    if (args.publicMotivatorPolicy !== undefined) {
      patch.publicMotivatorPolicy = args.publicMotivatorPolicy;
    }
    // Allow syncing the denormalized ownerHandle if the caller explicitly
    // passes one (used by profile/handle change flows). Optional field —
    // most update calls don't include it.
    if (args.ownerHandle !== undefined) {
      patch.ownerHandle = args.ownerHandle;
    }
    if (args.coverImageId !== undefined) patch.coverImageId = args.coverImageId;
    if (args.targetValue !== undefined) patch.targetValue = args.targetValue;
    if (args.startValue !== undefined) patch.startValue = args.startValue;
    if (args.unit !== undefined) patch.unit = args.unit;
    if (args.direction !== undefined) patch.direction = args.direction;

    // Re-run the coherence checks `create` enforces. These fields are only
    // editable before a goal has traction, but until now nothing stopped an
    // owner setting start === target or putting the target on the wrong side
    // of the direction — which makes `computeProgress` fall into its
    // degenerate branch and silently report 0% forever.
    if (
      args.targetValue !== undefined ||
      args.startValue !== undefined ||
      args.direction !== undefined
    ) {
      const nextStart = (patch.startValue ?? goal.startValue ?? 0) as number;
      const nextTarget = (patch.targetValue ?? goal.targetValue) as number;
      const nextDirection = (patch.direction ?? goal.direction) as
        | "increase"
        | "decrease";
      if (!Number.isFinite(nextStart) || !Number.isFinite(nextTarget)) {
        throw new Error("Start and target must be numbers");
      }
      if (goal.progressType === "number") {
        if (nextStart === nextTarget) {
          throw new Error("Start and target must differ");
        }
        if (
          nextDirection === "decrease"
            ? nextTarget >= nextStart
            : nextTarget <= nextStart
        ) {
          throw new Error(
            "Target is on the wrong side of start for the chosen direction"
          );
        }
      }
    }
    if (args.targetDate !== undefined && args.targetDate <= Date.now()) {
      throw new Error("Target date must be in the future");
    }

    // Keep edits inside the same semantic measurement contract. Legacy goals
    // without metadata are inferred once from their existing category/type/unit.
    const nextUnit = (patch.unit ?? goal.unit) as string;
    const nextDirection = (patch.direction ?? goal.direction) as
      | "increase"
      | "decrease";
    const measurement =
      getMeasurementMetric(goal.category, goal.metricId) ??
      inferMeasurementMetric(
        goal.category,
        goal.progressType,
        nextUnit,
        nextDirection
      );
    if (!measurement || measurement.progressType !== goal.progressType) {
      throw new Error("This goal no longer has a valid measurement");
    }
    if (goal.progressType === "number") {
      if (!measurement.directions.includes(nextDirection)) {
        throw new Error("That direction does not fit this measurement");
      }
      if (!measurementAllowsUnit(measurement, nextUnit)) {
        throw new Error("That unit does not fit this measurement");
      }
    }
    patch.metricId = measurement.id;
    patch.measurementVersion = MEASUREMENT_VERSION;

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

    // Email — fan out a status-change notification to supporters +
    // motivators when the goal is paused or closed. Reuses the
    // `newUpdate` template via `notifyFollowersOfStatusChange`. Gated
    // by each follower's prefs. Skipped for "active" (resume) and
    // "completed" (covered by the targetHit fanout).
    if (status === "paused" || status === "closed") {
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfStatusChange, {
        goalId,
        ownerId: userId,
        newStatus: status,
        pausedReason: status === "paused" ? (pausedReason ?? "Taking a break") : undefined,
      });
    }
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

    // Email B11 — "Target hit" — when all milestones are checked off and
    // the goal wasn't already completed.
    const allDone = done && completedCount === goal.milestones.length;
    if (allDone && goal.status !== "completed") {
      await ctx.db.patch(goalId, { status: "completed" as any, updatedAt: Date.now() });
      const owner = await ctx.db.get(userId);
      if (owner?.email) {
        await ctx.runMutation(internal.emails.enqueue, {
          userId,
          toEmail: owner.email,
          templateId: "targetHit",
          category: "lifecycle",
          preferenceKey: "accountActivity",
          payload: JSON.stringify({
            ownerName: owner.name ?? owner.handle ?? "there",
            goalTitle: goal.title,
            goalSlug: goal.slug,
            ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
            unit: goal.unit,
            targetValue: goal.targetValue,
          }),
        });
      }

      // Fan out a "goal completed" email to supporters + motivators,
      // reusing the targetHit template. Gated by each follower's prefs.
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfCompletion, {
        goalId,
        ownerId: userId,
      });
    }

    return { progress: pct, newBadges: newTiers };
  },
});

/**
 * Change a goal's progress type. Only allowed when the goal has no traction
 * (no supporters, no logged progress) — mirrors the product philosophy that
 * progressType is a commitment to supporters.
 *
 * Server-side coercion per type (same as `create`):
 *   milestones → startValue=0, unit="milestones", targetValue=milestones.length
 *   streak     → startValue=0, unit="days", direction="increase"
 *   number     → keeps client-sent values with validation
 */
export const changeProgressType = mutation({
  args: {
    goalId: v.id("goals"),
    metricId: v.optional(v.string()),
    progressType: v.union(
      v.literal("number"),
      v.literal("streak"),
      v.literal("milestones")
    ),
    // Only used for "number":
    startValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    direction: v.optional(v.union(v.literal("increase"), v.literal("decrease"))),
    // Only used for "milestones":
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    // Traction gate — no changes once the goal has supporters or progress.
    const hasTraction =
      (goal.supporterCount ?? 0) > 0 ||
      (goal.currentValue ?? 0) !== (goal.startValue ?? 0);
    if (hasTraction) {
      throw new Error(
        "This goal already has supporters or logged progress. Close it and create a new one to change the tracking method."
      );
    }

    let startValue: number;
    let currentValue: number;
    let targetValue: number;
    let direction: "increase" | "decrease";
    let unit: string;
    let milestones: Array<{ id: string; title: string; done: boolean; completedAt?: number }> | undefined;

    if (args.progressType === "milestones") {
      startValue = 0;
      currentValue = 0;
      direction = "increase";
      unit = "milestones";
      milestones = (args.milestones ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        done: false,
      }));
      targetValue = milestones.length;
    } else if (args.progressType === "streak") {
      startValue = 0;
      currentValue = 0;
      direction = "increase";
      unit = "days";
      targetValue = args.targetValue ?? 30;
      milestones = undefined;
    } else {
      // "number"
      startValue = args.startValue ?? 0;
      targetValue = args.targetValue ?? 100;
      currentValue = startValue;
      direction = args.direction ?? "increase";
      unit = args.unit ?? "units";
      milestones = undefined;
      if (startValue === targetValue) throw new Error("Start and target must differ");
    }

    const measurement = args.metricId
      ? getMeasurementMetric(goal.category, args.metricId)
      : inferMeasurementMetric(
          goal.category,
          args.progressType,
          unit,
          direction
        );
    if (!measurement || measurement.progressType !== args.progressType) {
      throw new Error("Choose a measurement that fits this goal category");
    }
    if (args.progressType === "number") {
      if (!measurement.directions.includes(direction)) {
        throw new Error("That direction does not fit this measurement");
      }
      if (!measurementAllowsUnit(measurement, unit)) {
        throw new Error("That unit does not fit this measurement");
      }
      if (
        direction === "decrease"
          ? targetValue >= startValue
          : targetValue <= startValue
      ) {
        throw new Error("Target is on the wrong side of start for the chosen direction");
      }
    }
    if (args.progressType === "streak" && (!Number.isInteger(targetValue) || targetValue <= 0)) {
      throw new Error("Streak targets must be a positive number of days");
    }
    if (args.progressType === "milestones" && milestones?.length === 0) {
      throw new Error("Add at least one milestone");
    }

    await ctx.db.patch(args.goalId, {
      progressType: args.progressType,
      metricId: measurement.id,
      measurementVersion: MEASUREMENT_VERSION,
      startValue,
      currentValue,
      targetValue,
      direction,
      unit,
      milestones,
      updatedAt: Date.now(),
    });

    return { ok: true, progressType: args.progressType };
  },
});

/** Add a milestone to an existing milestone-type goal. */
export const addMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
  },
  handler: async (ctx, { goalId, title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.progressType !== "milestones") throw new Error("Not a milestone goal");

    const trimmed = title.trim();
    if (!trimmed) throw new Error("Milestone title can't be empty");

    const current = goal.milestones ?? [];
    const id = `m${current.length + 1}_${Date.now()}`;
    const milestones = [...current, { id, title: trimmed, done: false }];
    const completedCount = milestones.filter((m) => m.done).length;

    await ctx.db.patch(goalId, {
      milestones,
      targetValue: milestones.length,
      currentValue: completedCount,
      updatedAt: Date.now(),
    });

    return { id };
  },
});

/** Remove a milestone from an existing milestone-type goal (only if not done). */
export const removeMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    milestoneId: v.string(),
  },
  handler: async (ctx, { goalId, milestoneId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.progressType !== "milestones") throw new Error("Not a milestone goal");

    const current = goal.milestones ?? [];
    const target = current.find((m) => m.id === milestoneId);
    if (!target) throw new Error("Milestone not found");
    if (target.done) throw new Error("Can't remove a completed milestone");

    const milestones = current.filter((m) => m.id !== milestoneId);
    const completedCount = milestones.filter((m) => m.done).length;

    await ctx.db.patch(goalId, {
      milestones,
      targetValue: milestones.length,
      currentValue: completedCount,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Rename an existing milestone (owner only). */
export const renameMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    milestoneId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { goalId, milestoneId, title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.progressType !== "milestones") throw new Error("Not a milestone goal");

    const trimmed = title.trim();
    if (!trimmed) throw new Error("Milestone title can't be empty");

    const milestones = (goal.milestones ?? []).map((m) =>
      m.id === milestoneId ? { ...m, title: trimmed } : m
    );

    await ctx.db.patch(goalId, { milestones, updatedAt: Date.now() });
    return { ok: true };
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

    // Every table carrying a `goalId` + `by_goal` index. The Motivation
    // Circle tables were missing here, so deleting a goal left motivators
    // holding pledges, invites, applications and check-ins pointing at a
    // row that no longer exists — their dashboards would render entries for
    // a goal nobody can open. `reports` is included so a deleted goal
    // doesn't leave unresolvable items in the moderation queue.
    for (const table of [
      "reactions",
      "badges",
      "achievements",
      "supporters",
      "supportMessages",
      "motivatorInvites",
      "motivatorPledges",
      "motivatorApplications",
      "checkIns",
      "reports",
    ] as const) {
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
 * Log a streak day — increments currentValue by 1 for streak goals.
 * Prevents double-logging the same day.
 */
export const logStreakDay = mutation({
  args: {
    goalId: v.id("goals"),
    note: v.optional(v.string()),
    /**
     * The caller's `new Date().getTimezoneOffset()` — minutes *behind* UTC
     * (UTC-7 sends 420). Needed because "did I already log today?" has to be
     * answered in the user's day, not the server's. Optional so older clients
     * keep working; omitted means UTC.
     */
    tzOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { goalId, note, tzOffsetMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.status !== "active") throw new Error("This goal isn't active");
    if (goal.progressType !== "streak") throw new Error("This goal isn't a streak");

    const now = Date.now();
    const offset = safeTimezoneOffset(
      tzOffsetMinutes ?? goal.streakTimezoneOffsetMinutes
    );
    const todayKey = localDayKey(now, offset);
    const yesterdayKey = localDayKey(now - DAY_MS, offset);

    // New rows carry an exact local day key. For pre-migration streaks,
    // infer the last day once from the newest value update.
    let lastLoggedDay = goal.streakLastLoggedDay;
    if (!lastLoggedDay) {
      const recent = await ctx.db
        .query("updates")
        .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
        .order("desc")
        .take(200);
      const lastValue = recent.find((update) => update.type === "value" && !update.revertedAt);
      if (lastValue) lastLoggedDay = localDayKey(lastValue.createdAt, offset);
    }

    if (lastLoggedDay === todayKey) throw new Error("Already logged today");

    const newValue =
      lastLoggedDay === yesterdayKey ? (goal.currentValue ?? 0) + 1 : 1;
    const bestStreak = Math.max(goal.streakBest ?? goal.currentValue ?? 0, newValue);
    const updateId = await ctx.db.insert("updates", {
      goalId,
      ownerId: userId,
      type: "value",
      value: newValue,
      note: note?.trim() || undefined,
      moderationStatus: note?.trim() ? "pending" : "approved",
      publicVisible: !note?.trim(),
      createdAt: now,
    });
    if (note?.trim()) {
      await ctx.scheduler.runAfter(0, internal.moderation.reviewUpdate, { updateId });
    }
    await ctx.db.patch(goalId, {
      currentValue: newValue,
      streakBest: bestStreak,
      streakLastLoggedDay: todayKey,
      streakTimezoneOffsetMinutes: offset,
      lastStaleReminderAt: undefined,
      updatedAt: now,
    });

    const pct = computeProgress(goal.startValue, newValue, goal.targetValue, goal.direction);
    const existingBadges = await ctx.db
      .query("badges")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const awarded = existingBadges.map((b) => b.tier);
    const newTiers = newMilestoneTiers(pct, awarded);
    for (const tier of newTiers) {
      await ctx.db.insert("badges", { goalId, ownerId: userId, tier, awardedAt: now });
    }

    const earnedAchievements = [];
    for (const achievement of STREAK_ACHIEVEMENTS) {
      if (achievement.value > bestStreak) continue;
      const key = `streak-${achievement.value}`;
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_goal_key", (q) => q.eq("goalId", goalId).eq("key", key))
        .first();
      if (exists) continue;
      await ctx.db.insert("achievements", {
        goalId,
        ownerId: userId,
        key,
        kind: "streak",
        title: achievement.title,
        description: achievement.description,
        value: achievement.value,
        awardedAt: now,
      });
      earnedAchievements.push(achievement.title);
    }

    // Target hit?
    const targetHit =
      goal.status !== "completed" && newValue >= goal.targetValue;
    if (targetHit) {
      await ctx.db.patch(goalId, { status: "completed" as any, updatedAt: now });
      const owner = await ctx.db.get(userId);
      if (owner?.email) {
        await ctx.runMutation(internal.emails.enqueue, {
          userId,
          toEmail: owner.email,
          templateId: "targetHit",
          category: "lifecycle",
          preferenceKey: "accountActivity",
          payload: JSON.stringify({
            ownerName: owner.name ?? owner.handle ?? "there",
            goalTitle: goal.title,
            goalSlug: goal.slug,
            ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
            unit: goal.unit,
            targetValue: goal.targetValue,
          }),
        });
      }

      // Fan out a "goal completed" email to supporters + motivators,
      // reusing the targetHit template. Gated by each follower's prefs.
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfCompletion, {
        goalId,
        ownerId: userId,
      });
    }

    // Fan out to followers (same as recordValue).
    if (!note?.trim()) {
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfUpdate, {
        goalId,
        ownerId: userId,
        updateId,
      });
    }

    return {
      progress: pct,
      newBadges: newTiers,
      newAchievements: earnedAchievements,
      streakCount: newValue,
      bestStreak,
      loggedDay: todayKey,
    };
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
    // Mirror the guard in `logStreakDay`. Without it this mutation writes
    // `currentValue` directly on any goal type: on a milestones goal that
    // sidesteps the checklist entirely and can flip the goal to "completed"
    // — firing the targetHit email and the completion fan-out to every
    // supporter and motivator — with no milestone actually ticked. On a
    // streak goal it bypasses the once-per-day check.
    if (goal.progressType !== "number") {
      throw new Error(
        goal.progressType === "milestones"
          ? "This goal tracks milestones — tick them off instead of logging a value"
          : "This goal tracks a streak — use the daily log instead"
      );
    }
    if (!Number.isFinite(value)) throw new Error("Value must be a number");

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
    // Reset stale-goal reminder so the next staleness window starts fresh.
    await ctx.db.patch(goalId, { lastStaleReminderAt: undefined });
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

    // Email B11 — "Target hit" — fires once, when the value first reaches
    // the target and the goal wasn't already completed.
    const targetHit =
      goal.status !== "completed" &&
      (goal.direction === "increase"
        ? value >= goal.targetValue
        : value <= goal.targetValue);
    if (targetHit) {
      await ctx.db.patch(goalId, { status: "completed" as any, updatedAt: now });
      const owner = await ctx.db.get(userId);
      if (owner?.email) {
        await ctx.runMutation(internal.emails.enqueue, {
          userId,
          toEmail: owner.email,
          templateId: "targetHit",
          category: "lifecycle",
          preferenceKey: "accountActivity",
          payload: JSON.stringify({
            ownerName: owner.name ?? owner.handle ?? "there",
            goalTitle: goal.title,
            goalSlug: goal.slug,
            ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
            unit: goal.unit,
            targetValue: goal.targetValue,
          }),
        });
      }

      // Fan out a "goal completed" email to supporters + motivators,
      // reusing the targetHit template. Gated by each follower's prefs.
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfCompletion, {
        goalId,
        ownerId: userId,
      });
    }

    // Email C4 — "New update" → fan out to followers (motivators + supporters).
    // Only for auto-approved updates (no text note); text updates gate on
    // moderation and fan out from applyUpdateDecision when approved.
    if (!note?.trim()) {
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfUpdate, {
        goalId,
        ownerId: userId,
        updateId,
      });
    }

    return { progress: pct, newBadges: newTiers };
  },
});

/**
 * Quick increment — adds `delta` (default 1) to the current value of a
 * number-type goal. A shortcut for "I read 1 more book" without typing
 * the full absolute value. Reuses recordValue's full logic internally.
 */
export const quickIncrement = mutation({
  args: {
    goalId: v.id("goals"),
    delta: v.optional(v.number()),
  },
  handler: async (ctx, { goalId, delta }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");
    if (goal.progressType !== "number") {
      throw new Error("Quick increment is only for number-type goals");
    }
    const step = delta ?? 1;
    const newValue = (goal.currentValue ?? goal.startValue ?? 0) + step;
    await ctx.db.patch(goalId, {
      currentValue: newValue,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("updates", {
      goalId,
      ownerId: userId,
      type: "value",
      value: newValue,
      moderationStatus: "approved",
      publicVisible: true,
      createdAt: Date.now(),
    });
    return { newValue };
  },
});


/**
 * Collect the people who should hear about a change to a goal.
 *
 * Followers = active motivators (committed tier) + supporters (casual tier),
 * deduped by userId so someone who is both gets one email rather than two.
 * The owner is always excluded. Each candidate is then gated on their own
 * notification prefs:
 *   - motivators: `yourMotivations`
 *   - supporters: `supportedGoalUpdates`
 *   - someone who is both passes if either is on
 *   - `unsubscribedAll` is handled downstream by `emails.enqueue`
 *
 * This used to be copy-pasted three times, once per fan-out below, which
 * meant a fix to the gating logic had to be made in three places to hold.
 */
async function collectNotifiableFollowers(ctx: any, goalId: any, ownerId: any) {
  const followerMap = new Map<
    string,
    { userId: any; isMotivator: boolean; isSupporter: boolean }
  >();

  const pledges = await ctx.db
    .query("motivatorPledges")
    .withIndex("by_goal_status", (q: any) =>
      q.eq("goalId", goalId).eq("status", "active")
    )
    .collect();
  for (const pledge of pledges) {
    if (pledge.userId === ownerId) continue;
    const entry = followerMap.get(pledge.userId);
    if (entry) entry.isMotivator = true;
    else
      followerMap.set(pledge.userId, {
        userId: pledge.userId,
        isMotivator: true,
        isSupporter: false,
      });
  }

  const supporters = await ctx.db
    .query("supporters")
    .withIndex("by_goal", (q: any) => q.eq("goalId", goalId))
    .collect();
  for (const supporter of supporters) {
    if (supporter.userId === ownerId) continue;
    const entry = followerMap.get(supporter.userId);
    if (entry) entry.isSupporter = true;
    else
      followerMap.set(supporter.userId, {
        userId: supporter.userId,
        isMotivator: false,
        isSupporter: true,
      });
  }

  const recipients: Array<{ userId: any; email: string; name: string }> = [];
  for (const [, { userId, isMotivator, isSupporter }] of followerMap) {
    const follower = await ctx.db.get(userId);
    if (!follower?.email) continue;
    const prefs = await ctx.runMutation(internal.notificationPrefs.getForUser, {
      userId,
    });
    if (prefs) {
      const motivatorOk = isMotivator && (prefs.yourMotivations ?? true);
      const supporterOk = isSupporter && (prefs.supportedGoalUpdates ?? true);
      if (!motivatorOk && !supporterOk) continue;
    }
    recipients.push({
      userId,
      email: follower.email,
      name: follower.name ?? follower.handle ?? "there",
    });
  }
  return recipients;
}

/** Owner's display name for fan-out copy. */
async function ownerDisplayName(ctx: any, ownerId: any) {
  const owner = await ctx.db.get(ownerId);
  return owner?.name ?? owner?.handle ?? "Someone";
}

/**
 * Owner display name for fan-out copy, respecting anonymous goals.
 * Anonymous goals use "Someone" so the owner's real name never appears
 * in emails to supporters/motivators.
 */
async function ownerDisplayNameForGoal(ctx: any, goalId: any, ownerId: any) {
  const goal = await ctx.db.get(goalId);
  if (goal?.isAnonymous) return "Someone";
  return ownerDisplayName(ctx, ownerId);
}

/**
 * Email C4 — fan out a "new update" notification to a goal's followers.
 *
 * Called via scheduler from:
 *   - recordValue / logStreakDay (auto-approved value-only updates)
 *   - moderation.applyUpdateDecision (when note/image/media updates are approved)
 */
export const notifyFollowersOfUpdate = internalMutation({
  args: {
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    updateId: v.optional(v.id("updates")),
  },
  handler: async (ctx, { goalId, ownerId, updateId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return;
    const ownerName = await ownerDisplayNameForGoal(ctx, goalId, ownerId);
    const owner = await ctx.db.get(ownerId);

    // Resolve update excerpt + value label if we have an updateId.
    let updateExcerpt: string | undefined;
    let valueLabel: string | undefined;
    if (updateId) {
      const update = await ctx.db.get(updateId);
      if (update?.note) updateExcerpt = update.note.slice(0, 200);
      if (update?.value !== undefined) {
        valueLabel = `${update.value} / ${goal.targetValue} ${goal.unit}`;
      }
    }

    const recipients = await collectNotifiableFollowers(ctx, goalId, ownerId);
    for (const r of recipients) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: r.userId,
        toEmail: r.email,
        templateId: "newUpdate",
        category: "lifecycle",
        preferenceKey: "goalUpdates",
        payload: JSON.stringify({
          motivatorName: r.name,
          ownerName,
          goalTitle: goal.title,
          goalSlug: goal.slug,
          ownerHandle: goal.isAnonymous ? undefined : (goal.ownerHandle ?? owner?.handle ?? undefined),
          updateExcerpt,
          valueLabel,
        }),
      });
    }
  },
});

/**
 * Fan out a "goal completed" email, reusing the `targetHit` template — it is
 * generic enough to read as a supporter-facing "they did it" message. Called
 * via scheduler from recordValue / logStreakDay / toggleMilestone.
 */
export const notifyFollowersOfCompletion = internalMutation({
  args: {
    goalId: v.id("goals"),
    ownerId: v.id("users"),
  },
  handler: async (ctx, { goalId, ownerId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return;

    const owner = await ctx.db.get(ownerId);
    const recipients = await collectNotifiableFollowers(ctx, goalId, ownerId);
    for (const r of recipients) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: r.userId,
        toEmail: r.email,
        templateId: "targetHit",
        category: "lifecycle",
        preferenceKey: "goalUpdates",
        payload: JSON.stringify({
          // The targetHit template greets by `ownerName`; for followers we
          // pass the follower's own name so it reads "Hi {follower}".
          ownerName: r.name,
          goalTitle: goal.title,
          goalSlug: goal.slug,
          ownerHandle: goal.isAnonymous ? undefined : (goal.ownerHandle ?? owner?.handle ?? undefined),
          unit: goal.unit,
          targetValue: goal.targetValue,
        }),
      });
    }
  },
});

/**
 * Fan out a "goal status changed" email when the owner pauses or closes the
 * goal. Reuses the `newUpdate` template (closest semantic match: "an update on
 * a goal you're following") with a status-change excerpt. Called via scheduler
 * from `setStatus`.
 */
export const notifyFollowersOfStatusChange = internalMutation({
  args: {
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    newStatus: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("closed")
    ),
    pausedReason: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, ownerId, newStatus, pausedReason }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return;
    const ownerName = await ownerDisplayNameForGoal(ctx, goalId, ownerId);
    const owner = await ctx.db.get(ownerId);

    const excerpt =
      newStatus === "paused"
        ? pausedReason
          ? `${ownerName} paused this goal: ${pausedReason}`
          : `${ownerName} pressed pause on this goal.`
        : newStatus === "closed"
          ? `${ownerName} closed this goal.`
          : `${ownerName} changed this goal's status to ${newStatus}.`;

    const recipients = await collectNotifiableFollowers(ctx, goalId, ownerId);
    for (const r of recipients) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: r.userId,
        toEmail: r.email,
        templateId: "newUpdate",
        category: "lifecycle",
        preferenceKey: "goalUpdates",
        payload: JSON.stringify({
          motivatorName: r.name,
          ownerName,
          goalTitle: goal.title,
          goalSlug: goal.slug,
          ownerHandle: goal.isAnonymous ? undefined : (goal.ownerHandle ?? owner?.handle ?? undefined),
          updateExcerpt: excerpt,
          valueLabel: undefined,
        }),
      });
    }
  },
});
