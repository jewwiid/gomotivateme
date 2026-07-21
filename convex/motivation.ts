/**
 * Motivation Circle — invites, pledges, applications, and check-ins.
 *
 * Data model split:
 *   - `motivatorInvites`  core-circle invites (creator → 6 hand-picked people)
 *   - `motivatorPledges`   accepted commitments (the "core motivator" record)
 *   - `motivatorApplications`  public users applying to join a goal's circle
 *   - `checkIns`            structured check-ins a motivator sends
 *
 * Coexistence with the existing casual `supporters` / `supportMessages`
 * tables: those remain the casual-cheer layer; this is the committed layer.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// =====================================================================
// Invites — the creator's pre-launch team
// =====================================================================

const inviteFields = v.object({
  goalId: v.id("goals"),
  creatorId: v.id("users"),
  name: v.string(),
  email: v.optional(v.string()),
  invitedUserId: v.optional(v.id("users")),
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
  token: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("declined"),
    v.literal("expired")
  ),
  pledgeId: v.optional(v.id("motivatorPledges")),
  goalTitle: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
});

/** Public: look up an invite by its one-time token (for the landing page). */
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("motivatorInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!invite) return null;
    // Soft-expire reads.
    if (invite.status === "pending" && invite.expiresAt < Date.now()) {
      return { ...invite, status: "expired" as const };
    }
    return invite;
  },
});

/** Owner: list every invite sent for a goal. */
export const listInvitesForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("motivatorInvites")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
  },
});

/**
 * Accept an invite.
 * Validates: invite is pending, not expired, the caller is allowed to accept.
 * For the MVP the invitee must be signed in. If their email matches a known
 * user, that's the user. Otherwise the creator must have set invitedUserId
 * (we resolve the actual signed-in user on accept).
 */
export const acceptInvite = mutation({
  args: {
    token: v.string(),
    /** Optional: the user may tweak the role or frequency before accepting. */
    role: v.optional(
      v.union(
        v.literal("encourager"),
        v.literal("accountability"),
        v.literal("advice"),
        v.literal("review"),
        v.literal("challenge")
      )
    ),
    checkInFrequency: v.optional(
      v.union(
        v.literal("afterUpdate"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("onRequest")
      )
    ),
    /** Free-text public pledge shown on the goal page. */
    pledgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to accept this invitation");
    const invite = await ctx.db
      .query("motivatorInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") {
      throw new Error(
        invite.status === "accepted"
          ? "This invitation has already been accepted"
          : invite.status === "declined"
          ? "This invitation has been declined"
          : "This invitation has expired"
      );
    }
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }
    // Cannot accept your own goal's invite.
    if (invite.creatorId === userId) {
      throw new Error("You can't accept an invite to your own goal");
    }

    const now = Date.now();
    const pledgeId = await ctx.db.insert("motivatorPledges", {
      goalId: invite.goalId,
      userId,
      role: args.role ?? invite.proposedRole,
      checkInFrequency: args.checkInFrequency ?? invite.proposedFrequency,
      pledgeText: args.pledgeText?.trim() || undefined,
      notificationPref: "weeklyDigest",
      status: "active",
      isCoreMotivator: true,
      acceptedAt: now,
    });
    await ctx.db.patch(invite._id, {
      status: "accepted",
      invitedUserId: userId,
      pledgeId,
    });
    return { goalId: invite.goalId, pledgeId };
  },
});

/** Decline an invite. */
export const declineInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to respond to this invitation");
    const invite = await ctx.db
      .query("motivatorInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") {
      throw new Error("This invitation is no longer pending");
    }
    await ctx.db.patch(invite._id, {
      status: "declined",
      invitedUserId: userId,
    });
    return { declined: true };
  },
});

/** Owner: revoke a pending invite. */
export const revokeInvite = mutation({
  args: { inviteId: v.id("motivatorInvites") },
  handler: async (ctx, { inviteId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.creatorId !== userId) throw new Error("Not the goal owner");
    if (invite.status !== "pending") {
      throw new Error("Only pending invites can be revoked");
    }
    await ctx.db.delete(inviteId);
    return { revoked: true };
  },
});

/**
 * Owner: add a new invite to an existing goal.
 * Cap is 6 total invites per goal. The goal can be in pre-launch OR active.
 */
export const addInvite = mutation({
  args: {
    goalId: v.id("goals"),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not found");

    const existing = await ctx.db
      .query("motivatorInvites")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
    if (existing.length >= 6) {
      throw new Error("Maximum of 6 invites per goal");
    }
    const now = Date.now();
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(36).slice(2)}`;
    const inviteId = await ctx.db.insert("motivatorInvites", {
      goalId: args.goalId,
      creatorId: userId,
      name: args.name.trim(),
      email: args.email?.trim() || undefined,
      proposedRole: args.proposedRole,
      proposedFrequency: args.proposedFrequency,
      personalMessage: args.personalMessage?.trim() || undefined,
      token,
      status: "pending",
      goalTitle: goal.title,
      createdAt: now,
      // If goal already had a pre-launch window, extend from now; else 14d.
      expiresAt:
        goal.preLaunchDeadline && goal.preLaunchDeadline > now
          ? goal.preLaunchDeadline
          : now + 14 * 24 * 60 * 60 * 1000,
    });
    return { inviteId, token };
  },
});

// =====================================================================
// Pledges — the actual commitment records (one per (goal, user))
// =====================================================================

/** Public: active motivators for a goal, with their role + pledge text. */
export const listActiveMotivators = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal_status", (q) =>
        q.eq("goalId", goalId).eq("status", "active")
      )
      .collect();
    // Hydrate the user profile for each pledge.
    const result = await Promise.all(
      pledges.map(async (p) => {
        const u = await ctx.db.get(p.userId);
        return {
          _id: p._id,
          role: p.role,
          checkInFrequency: p.checkInFrequency,
          pledgeText: p.pledgeText ?? null,
          isCoreMotivator: p.isCoreMotivator,
          acceptedAt: p.acceptedAt,
          lastCheckInAt: p.lastCheckInAt ?? null,
          user: u
            ? {
                _id: u._id,
                name: (u as { name?: string }).name ?? null,
                email: (u as { email?: string }).email ?? null,
                image: (u as { image?: string }).image ?? null,
              }
            : null,
        };
      })
    );
    // Core motivators first, then public motivators, then by acceptedAt.
    return result.sort((a, b) => {
      if (a.isCoreMotivator !== b.isCoreMotivator) {
        return a.isCoreMotivator ? -1 : 1;
      }
      return a.acceptedAt - b.acceptedAt;
    });
  },
});

/** Motivator: update my own pledge settings. */
export const updateMyPledge = mutation({
  args: {
    pledgeId: v.id("motivatorPledges"),
    checkInFrequency: v.optional(
      v.union(
        v.literal("afterUpdate"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("onRequest")
      )
    ),
    notificationPref: v.optional(
      v.union(
        v.literal("immediate"),
        v.literal("dailyDigest"),
        v.literal("weeklyDigest"),
        v.literal("onRequest")
      )
    ),
    pledgeText: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("removed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const pledge = await ctx.db.get(args.pledgeId);
    if (!pledge) throw new Error("Pledge not found");
    if (pledge.userId !== userId) throw new Error("Not your pledge");
    const { pledgeId, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.checkInFrequency !== undefined) patch.checkInFrequency = rest.checkInFrequency;
    if (rest.notificationPref !== undefined) patch.notificationPref = rest.notificationPref;
    if (rest.pledgeText !== undefined) patch.pledgeText = rest.pledgeText.trim() || undefined;
    if (rest.status !== undefined) patch.status = rest.status;
    await ctx.db.patch(pledgeId, patch);
    return { updated: true };
  },
});

/** Owner: remove a motivator (they become a former motivator). */
export const removeMotivator = mutation({
  args: { pledgeId: v.id("motivatorPledges") },
  handler: async (ctx, { pledgeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const pledge = await ctx.db.get(pledgeId);
    if (!pledge) throw new Error("Pledge not found");
    const goal = await ctx.db.get(pledge.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");
    await ctx.db.patch(pledgeId, { status: "removed" });
    return { removed: true };
  },
});

/** A user: list the goals I am motivating (or have motivated). */
export const listMyMotivations = query({
  args: {
    includeStatuses: v.optional(
      v.array(
        v.union(
          v.literal("active"),
          v.literal("paused"),
          v.literal("completed"),
          v.literal("removed")
        )
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const statuses = args.includeStatuses ?? ["active", "paused"];
    const all = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter((p) => statuses.includes(p.status))
      .map((p) => ({
        _id: p._id,
        goalId: p.goalId,
        role: p.role,
        checkInFrequency: p.checkInFrequency,
        pledgeText: p.pledgeText ?? null,
        status: p.status,
        isCoreMotivator: p.isCoreMotivator,
        acceptedAt: p.acceptedAt,
        lastCheckInAt: p.lastCheckInAt ?? null,
      }));
  },
});
