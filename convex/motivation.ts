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
import { internal } from "./_generated/api";
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

    // Email — notify the goal owner that a motivator accepted their invite.
    // Reuse the "applicationDecision" template with decision "approved"
    // (semantic match: "someone is now on your team"). Gated by the owner's
    // `newMotivatorOnGoal` pref via category "lifecycle".
    if (invite.creatorId !== userId) {
      const owner = await ctx.db.get(invite.creatorId);
      const motivator = await ctx.db.get(userId);
      if (owner?.email) {
        const prefs = await ctx.runMutation(
          internal.notificationPrefs.getForUser,
          { userId: invite.creatorId }
        );
        if (!prefs || (prefs.newMotivatorOnGoal ?? true)) {
          await ctx.runMutation(internal.emails.enqueue, {
            userId: invite.creatorId,
            toEmail: owner.email,
            templateId: "applicationDecision",
            category: "lifecycle",
            payload: JSON.stringify({
              applicantName: motivator?.name ?? motivator?.handle ?? "Someone",
              goalTitle: invite.goalTitle,
              goalSlug: (await ctx.db.get(invite.goalId))?.slug ?? "",
              decision: "approved",
              roleLabel: args.role ?? invite.proposedRole,
            }),
          });
        }
      }
    }

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

    // Email C1 — "You're invited to motivate" — only if we have an address.
    if (args.email?.trim()) {
      const owner = await ctx.db.get(userId);
      await ctx.runMutation(internal.emails.enqueue, {
        userId: undefined, // may not have an account yet
        toEmail: args.email.trim(),
        templateId: "inviteReceived",
        category: "transactional",
        payload: JSON.stringify({
          ownerName: owner?.name ?? "Someone",
          goalTitle: goal.title,
          inviteMessage: args.personalMessage,
          roleLabel: args.proposedRole,
          inviteToken: token,
        }),
      });
    }

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

// =====================================================================
// Applications — public users applying to join a goal's circle
// =====================================================================

const roleArg = v.union(
  v.literal("encourager"),
  v.literal("accountability"),
  v.literal("advice"),
  v.literal("review"),
  v.literal("challenge")
);

const frequencyArg = v.union(
  v.literal("afterUpdate"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("onRequest")
);

/**
 * Public user applies to motivate a goal.
 * - Rejects if the goal's publicMotivatorPolicy === "disabled".
 * - Rejects if the user already has an active pledge on this goal.
 * - Rejects if the user has a pending application.
 * - If the goal's publicMotivatorPolicy === "auto", creates the pledge
 *   immediately and returns {kind: "auto-accepted", pledgeId}.
 * - Otherwise creates an application in "pending" status and returns
 *   {kind: "pending", applicationId}.
 */
export const requestApplication = mutation({
  args: {
    goalId: v.id("goals"),
    requestedRole: roleArg,
    requestedFrequency: frequencyArg,
    message: v.string(),
    pledgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to apply");
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.ownerId === userId) {
      throw new Error("You can't apply to your own goal");
    }
    if (goal.status === "closed") {
      throw new Error("This goal is closed");
    }
    if (goal.publicMotivatorPolicy === "disabled") {
      throw new Error("The goal owner isn't accepting public motivators");
    }

    // Already motivating?
    const existingPledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
    const alreadyActive = existingPledges.some(
      (p) => p.userId === userId && (p.status === "active" || p.status === "paused")
    );
    if (alreadyActive) {
      throw new Error("You're already motivating this goal");
    }

    // Already applied?
    const myApps = await ctx.db
      .query("motivatorApplications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();
    const pendingApp = myApps.find(
      (a) => a.goalId === args.goalId && a.status === "pending"
    );
    if (pendingApp) {
      throw new Error("You already have a pending application");
    }

    const now = Date.now();
    const message = args.message.trim();
    if (message.length === 0) throw new Error("Tell the goal owner why you'd be a good fit");

    if (goal.publicMotivatorPolicy === "auto") {
      // Auto-accept: create the pledge directly.
      const pledgeId = await ctx.db.insert("motivatorPledges", {
        goalId: args.goalId,
        userId,
        role: args.requestedRole,
        checkInFrequency: args.requestedFrequency,
        pledgeText: args.pledgeText?.trim() || undefined,
        notificationPref: "weeklyDigest",
        status: "active",
        isCoreMotivator: false,
        acceptedAt: now,
      });
      // Also record the application as accepted (audit trail).
      await ctx.db.insert("motivatorApplications", {
        goalId: args.goalId,
        applicantId: userId,
        requestedRole: args.requestedRole,
        message,
        status: "accepted",
        pledgeId,
        createdAt: now,
      });
      return { kind: "auto-accepted" as const, pledgeId };
    }

    // "approval" — pending application.
    const applicationId = await ctx.db.insert("motivatorApplications", {
      goalId: args.goalId,
      applicantId: userId,
      requestedRole: args.requestedRole,
      message,
      status: "pending",
      createdAt: now,
    });

    // Email B1 — "New motivator application" → to the goal owner.
    const owner = await ctx.db.get(goal.ownerId);
    const applicant = await ctx.db.get(userId);
    if (owner?.email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: goal.ownerId,
        toEmail: owner.email,
        templateId: "newApplication",
        category: "transactional",
        payload: JSON.stringify({
          ownerName: owner.name ?? "there",
          motivatorName: applicant?.name ?? applicant?.handle ?? "Someone",
          goalTitle: goal.title,
          goalSlug: goal.slug,
          roleLabel: args.requestedRole,
          applicationMessage: message,
        }),
      });
    }

    return { kind: "pending" as const, applicationId };
  },
});

/** Owner: approve a pending application — creates a public pledge. */
export const approveApplication = mutation({
  args: {
    applicationId: v.id("motivatorApplications"),
    role: v.optional(roleArg),
    checkInFrequency: v.optional(frequencyArg),
    pledgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new Error("Application not found");
    if (app.status !== "pending") {
      throw new Error("This application has already been decided");
    }
    const goal = await ctx.db.get(app.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");

    // Check the applicant isn't already motivating (race condition guard).
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal", (q) => q.eq("goalId", app.goalId))
      .collect();
    const already = pledges.some(
      (p) => p.userId === app.applicantId && (p.status === "active" || p.status === "paused")
    );
    if (already) {
      // Mark the application accepted but don't double-pledge.
      await ctx.db.patch(args.applicationId, { status: "accepted" });
      return { alreadyMotivating: true };
    }

    const now = Date.now();
    const pledgeId = await ctx.db.insert("motivatorPledges", {
      goalId: app.goalId,
      userId: app.applicantId,
      role: args.role ?? app.requestedRole,
      checkInFrequency: args.checkInFrequency ?? "weekly",
      pledgeText: args.pledgeText?.trim() || undefined,
      notificationPref: "weeklyDigest",
      status: "active",
      isCoreMotivator: false,
      acceptedAt: now,
    });
    await ctx.db.patch(args.applicationId, {
      status: "accepted",
      pledgeId,
    });

    // Email C2 — "Application decision" → to the applicant.
    const applicant = await ctx.db.get(app.applicantId);
    if (applicant?.email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: app.applicantId,
        toEmail: applicant.email,
        templateId: "applicationDecision",
        category: "transactional",
        payload: JSON.stringify({
          applicantName: applicant.name ?? applicant.handle ?? "there",
          goalTitle: goal.title,
          goalSlug: goal.slug,
          decision: "approved",
          roleLabel: args.role ?? app.requestedRole,
        }),
      });
    }

    return { pledgeId };
  },
});

/** Owner: decline a pending application. */
export const declineApplication = mutation({
  args: { applicationId: v.id("motivatorApplications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found");
    if (app.status !== "pending") {
      throw new Error("This application has already been decided");
    }
    const goal = await ctx.db.get(app.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");
    await ctx.db.patch(applicationId, { status: "declined" });

    // Email C2 — "Application decision" → to the applicant.
    const applicant = await ctx.db.get(app.applicantId);
    if (applicant?.email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: app.applicantId,
        toEmail: applicant.email,
        templateId: "applicationDecision",
        category: "transactional",
        payload: JSON.stringify({
          applicantName: applicant.name ?? applicant.handle ?? "there",
          goalTitle: goal.title,
          goalSlug: goal.slug,
          decision: "declined",
          roleLabel: app.requestedRole,
        }),
      });
    }

    return { declined: true };
  },
});

/** Owner: list pending applications for a goal, hydrated with the applicant. */
export const listPendingApplications = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    const apps = await ctx.db
      .query("motivatorApplications")
      .withIndex("by_goal_status", (q) =>
        q.eq("goalId", goalId).eq("status", "pending")
      )
      .collect();
    return Promise.all(
      apps.map(async (a) => {
        const u = await ctx.db.get(a.applicantId);
        return {
          _id: a._id,
          requestedRole: a.requestedRole,
          message: a.message,
          createdAt: a.createdAt,
          applicant: u
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
  },
});

/** Public: my application status for a goal (or null). */
export const myApplicationForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const apps = await ctx.db
      .query("motivatorApplications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();
    return apps.find((a) => a.goalId === goalId) ?? null;
  },
});

// =====================================================================
// Check-ins — the committed-tier follow-through
// =====================================================================

const CHECK_IN_TYPES = [
  "encouragement",
  "accountability",
  "advice",
  "reflection",
  "milestone",
] as const;

/**
 * Motivator: create a check-in on a goal they've pledged to. Stamps
 * lastCheckInAt on the pledge (the field that was previously never written).
 * Notifies the goal owner via email.
 */
export const createCheckIn = mutation({
  args: {
    pledgeId: v.id("motivatorPledges"),
    type: v.string(),
    body: v.string(),
    updateId: v.optional(v.id("updates")),
  },
  handler: async (ctx, { pledgeId, type, body, updateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const pledge = await ctx.db.get(pledgeId);
    if (!pledge) throw new Error("Pledge not found");
    if (pledge.userId !== userId) throw new Error("Not your pledge");
    if (pledge.status !== "active") throw new Error("This pledge isn't active");

    if (!CHECK_IN_TYPES.includes(type as (typeof CHECK_IN_TYPES)[number])) {
      throw new Error("Invalid check-in type");
    }
    const trimmed = body.trim();
    if (trimmed.length === 0) throw new Error("Check-in message is empty");
    if (trimmed.length > 1000) throw new Error("Check-in is too long (1000 max)");

    const goal = await ctx.db.get(pledge.goalId);
    if (!goal) throw new Error("Goal not found");

    const now = Date.now();
    await ctx.db.insert("checkIns", {
      goalId: pledge.goalId,
      motivatorId: userId,
      creatorId: goal.ownerId,
      type: type as any,
      body: trimmed,
      updateId,
      createdAt: now,
    });
    await ctx.db.patch(pledgeId, { lastCheckInAt: now });

    // Email B6-style — notify the goal owner that a motivator checked in.
    if (goal.ownerId !== userId) {
      const owner = await ctx.db.get(goal.ownerId);
      if (owner?.email) {
        const motivator = await ctx.db.get(userId);
        await ctx.runMutation(internal.emails.enqueue, {
          userId: goal.ownerId,
          toEmail: owner.email,
          templateId: "supportMessageReceived",
          category: "transactional",
          payload: JSON.stringify({
            ownerName: owner.name ?? owner.handle ?? "there",
            authorName: motivator?.name ?? motivator?.handle ?? "Someone",
            goalTitle: goal.title,
            goalSlug: goal.slug,
            messageExcerpt: trimmed.slice(0, 160),
            supportTypeLabel: `a ${type} check-in`,
          }),
        });
      }
    }

    return { ok: true as const };
  },
});

/**
 * List check-ins for a goal. Visible to the goal owner and to active
 * motivators on that goal. Returns hydrated check-ins (motivator profile
 * joined). Newest first.
 */
export const listCheckInsForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal) return [];

    const isOwner = goal.ownerId === userId;
    let isMotivator = false;
    if (!isOwner) {
      const pledge = await ctx.db
        .query("motivatorPledges")
        .withIndex("by_goal_status", (q) =>
          q.eq("goalId", goalId).eq("status", "active")
        )
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      isMotivator = !!pledge;
    }
    if (!isOwner && !isMotivator) return [];

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .take(50);

    // Hydrate motivator profiles in parallel.
    const motivatorIds = [...new Set(checkIns.map((c) => c.motivatorId))];
    const profiles = await Promise.all(
      motivatorIds.map(async (id) => {
        const u = await ctx.db.get(id);
        return {
          id,
          name: (u as any)?.name ?? (u as any)?.handle ?? "Someone",
          image: (u as any)?.image ?? null,
          handle: (u as any)?.handle ?? null,
        };
      })
    );
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return checkIns.map((c) => ({
      _id: c._id,
      type: c.type,
      body: c.body,
      createdAt: c.createdAt,
      acknowledgedAt: c.acknowledgedAt ?? null,
      motivator: profileMap.get(c.motivatorId)!,
    }));
  },
});

/** Owner: mark a check-in as acknowledged (read). */
export const acknowledgeCheckIn = mutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, { checkInId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const checkIn = await ctx.db.get(checkInId);
    if (!checkIn) throw new Error("Check-in not found");
    const goal = await ctx.db.get(checkIn.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");
    if (checkIn.acknowledgedAt) return { ok: true }; // already acknowledged
    await ctx.db.patch(checkInId, { acknowledgedAt: Date.now() });
    return { ok: true as const };
  },
});
