// @ts-nocheck — see convex/goals.ts header.
/**
 * Email send layer — mutations + queries (isolate runtime).
 *
 * The Node-dependent drain action lives in `convex/emailsActions.ts`
 * (with `"use node"`) so Resend + React Email can be imported there.
 *
 * Flow:
 *   1. `enqueue` (internalMutation) — called from trigger points via
 *      `ctx.runMutation(internal.emails.enqueue, {...})`. Writes a
 *      `notifications` row. Checks prefs: lifecycle email to a user who
 *      opted out is marked "suppressed" and never sent.
 *   2. `drainQueue` (in emailsActions.ts, Node runtime) — runs on a cron,
 *      calls Resend, marks rows sent/failed via markSent/markFailed here.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeProgress } from "./utils";

// =====================================================================
// Enqueue — write a notification row from a trigger mutation.
// =====================================================================

export const enqueue = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    toEmail: v.string(),
    templateId: v.string(),
    payload: v.string(),
    category: v.union(v.literal("transactional"), v.literal("lifecycle")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Pref check: suppress lifecycle email to opted-out users.
    if (args.userId && args.category === "lifecycle") {
      const prefs = await ctx.runMutation(internal.notificationPrefs.getForUser, {
        userId: args.userId,
      });
      if (prefs?.unsubscribedAll) {
        await ctx.db.insert("notifications", {
          ...args,
          status: "suppressed",
          attempts: 0,
          createdAt: now,
        });
        return { status: "suppressed" as const };
      }
    }

    // Inject the recipient's unsubscribe token into the payload so templates
    // can render a footer unsubscribe link. Minted lazily here (covers users
    // who never went through updateProfile, e.g. Google OAuth sign-ins). Same
    // mint pattern as users.ts:282. Non-user emails (userId absent, e.g.
    // inviteReceived) get no token — they render the "service message" footer.
    let payload = args.payload;
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      const existing = (user as { unsubscribeToken?: string } | null)?.unsubscribeToken;
      const token =
        existing ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (!existing) {
        await ctx.db.patch(args.userId, { unsubscribeToken: token });
      }
      try {
        const parsed = JSON.parse(payload);
        parsed.unsubscribeToken = token;
        payload = JSON.stringify(parsed);
      } catch {
        // payload wasn't valid JSON — leave it as-is (template will render
        // without a footer link rather than crash the enqueue).
      }
    }

    await ctx.db.insert("notifications", {
      ...args,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: now,
    });
    return { status: "pending" as const };
  },
});

// =====================================================================
// Drain helpers — called by the Node action (emailsActions.ts).
// =====================================================================

/** Internal query: fetch up to `limit` pending notifications, oldest first. */
export const getPending = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 20;
    return await ctx.db
      .query("notifications")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(take);
  },
});

export const markSent = internalMutation({
  args: { id: v.id("notifications"), resendId: v.optional(v.string()) },
  handler: async (ctx, { id, resendId }) => {
    const patch: any = { status: "sent", sentAt: Date.now(), attempts: 1 };
    if (resendId) patch.resendId = resendId;
    await ctx.db.patch(id, patch);
  },
});

export const markFailed = internalMutation({
  args: { id: v.id("notifications"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.patch(id, {
      error,
      attempts: (doc.attempts ?? 0) + 1,
      // Keep retrying up to 3 attempts, then mark failed permanently.
      status: (doc.attempts ?? 0) + 1 >= 3 ? "failed" : "pending",
    });
  },
});

/**
 * Retention: delete terminal notifications (sent/failed/suppressed) older
 * than 90 days. Never touches "pending" rows. Capped per run so it can't
 * block. Runs daily via crons.ts. Satisfies GDPR Art. 5(1)(e) storage
 * limitation — email content (names, titles, personal messages) isn't
 * retained indefinitely.
 */
export const purgeOld = internalMutation({
  args: { olderThanMs: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { olderThanMs, limit }) => {
    const cutoff = Date.now() - (olderThanMs ?? 90 * 24 * 60 * 60 * 1000);
    const cap = limit ?? 200;
    let deleted = 0;
    for (const status of ["sent", "failed", "suppressed"] as const) {
      const rows = await ctx.db
        .query("notifications")
        .withIndex("by_status_created", (q) =>
          q.eq("status", status).lt("createdAt", cutoff)
        )
        .take(cap - deleted);
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
      deleted += rows.length;
      if (deleted >= cap) break;
    }
    return { deleted };
  },
});

// =====================================================================
// Weekly digest support — queries called by the Node-action worker.
// =====================================================================

/**
 * List all users opted into the weekly digest (and not unsubscribedAll).
 * Called by the sendWeeklyDigests cron action. Returns { userId, email }[].
 */
export const listDigestSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_weekly_digest", (q) => q.eq("weeklyDigest", true))
      .collect();
    return prefs
      .filter((p) => !p.unsubscribedAll && p.email)
      .map((p) => ({ userId: p.userId, email: p.email! }));
  },
});

/**
 * Gather everything the weekly digest needs for one user: their active
 * goals + per-goal weekly activity counts (last 7 days). Returns null if
 * the user has no active goals or no activity this week (skip the digest).
 */
export const getDigestData = internalQuery({
  args: { userId: v.id("users"), sinceMs: v.optional(v.number()) },
  handler: async (ctx, { userId, sinceMs }) => {
    const since = sinceMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const user = await ctx.db.get(userId);
    const firstName = (user as any)?.name?.split(" ")[0] ?? null;

    // Active + paused + completed goals (exclude draft + closed).
    const allGoals = await ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .collect();
    const goals = allGoals.filter(
      (g) => g.status === "active" || g.status === "paused" || g.status === "completed"
    );

    let totalActivity = 0;
    const goalData = [];
    for (const goal of goals) {
      const [updates, messages, checkIns, supporters] = await Promise.all([
        ctx.db
          .query("updates")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", since)
          )
          .collect(),
        ctx.db
          .query("supportMessages")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", since)
          )
          .collect(),
        ctx.db
          .query("checkIns")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", since)
          )
          .collect(),
        // No time index on supporters — scan by_goal and filter in JS.
        ctx.db
          .query("supporters")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect(),
      ]);

      const newSupporters = supporters.filter((s) => s.createdAt >= since).length;
      const activity = updates.length + messages.length + checkIns.length + newSupporters;
      totalActivity += activity;

      const progressPct = computeProgress(
        goal.startValue ?? 0,
        goal.currentValue ?? 0,
        goal.targetValue ?? 0,
        goal.direction ?? "increase"
      );

      goalData.push({
        title: goal.title,
        slug: goal.slug,
        unit: goal.unit,
        currentValue: goal.currentValue ?? 0,
        targetValue: goal.targetValue ?? 0,
        progressPct,
        progressType: goal.progressType,
        updates: updates.length,
        messages: messages.length,
        checkIns: checkIns.length,
        newSupporters,
      });
    }

    // Skip the digest if there's nothing to report.
    if (goalData.length === 0 || totalActivity === 0) return null;

    return { firstName, email: (user as any)?.email ?? null, goals: goalData };
  },
});

/**
 * Internal: find active pledges whose check-in cadence has elapsed and
 * haven't been reminded in this overdue cycle. Returns pledge data +
 * hydrated motivator/goal info for the reminder email.
 * Called by the daily sendCheckInReminders cron action.
 */
export const listDueCheckIns = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Scan all active pledges. This is a table scan but the pledges table
    // stays small (one row per motivator commitment). Acceptable at scale.
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal_status", (q) => q.eq("status", "active"))
      .collect();

    const due = [];
    for (const pledge of pledges) {
      // Only weekly + monthly have time-based cadences.
      if (pledge.checkInFrequency !== "weekly" && pledge.checkInFrequency !== "monthly") {
        continue;
      }
      const cadenceDays = pledge.checkInFrequency === "weekly" ? 7 : 30;
      const lastActivity = pledge.lastCheckInAt ?? pledge.acceptedAt;
      const elapsed = now - lastActivity;
      const cadenceMs = cadenceDays * DAY;

      // Only remind if overdue AND we haven't already reminded for this cycle.
      // lastReminderAt is set when we send; a new check-in resets lastCheckInAt
      // so the next overdue window starts fresh.
      if (elapsed < cadenceMs) continue;
      if (pledge.lastReminderAt && pledge.lastReminderAt > lastActivity) {
        // Already reminded for this overdue cycle — skip until they check in.
        continue;
      }

      const motivator = await ctx.db.get(pledge.userId);
      const goal = await ctx.db.get(pledge.goalId);
      if (!motivator?.email || !goal) continue;

      due.push({
        pledgeId: pledge._id,
        motivatorName: motivator.name ?? motivator.handle ?? "there",
        motivatorEmail: motivator.email,
        motivatorId: pledge.userId,
        ownerName: goal.ownerName ?? "Someone",
        goalTitle: goal.title,
        goalSlug: goal.slug,
        daysSinceLastCheckin: Math.floor(elapsed / DAY),
      });
    }
    return due;
  },
});

/** Internal: stamp lastReminderAt on a pledge (prevents daily reminder spam). */
export const markPledgeReminded = internalMutation({
  args: { pledgeId: v.id("motivatorPledges") },
  handler: async (ctx, { pledgeId }) => {
    await ctx.db.patch(pledgeId, { lastReminderAt: Date.now() });
  },
});

// =====================================================================
// Accountability queries — stale goals, deadline approaching, deadline passed
// =====================================================================

const DAY = 24 * 60 * 60 * 1000;

/**
 * Find active goals where the creator hasn't posted an update in 7+ days.
 * Groups by owner so each creator gets one consolidated email (not one per goal).
 * Skips goals already reminded in the last 7 days.
 * Returns { ownerId, email, name, goals: [{title, slug, daysSinceLastUpdate, supporterCount, motivatorCount}] }[]
 */
export const listStaleGoals = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const staleThreshold = 7 * DAY;
    const reRemindThreshold = 7 * DAY;

    // Scan active goals (table scan, but filtered to active only).
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) =>
        q.eq("visibility", "public").eq("status", "active")
      )
      .collect();

    // Group by owner so we send one email per creator.
    const byOwner = new Map<string, {
      ownerId: any;
      goals: Array<{
        goalId: any;
        title: string;
        slug: string;
        daysSinceLastUpdate: number;
        supporterCount: number;
        motivatorCount: number;
      }>;
    }>();

    for (const goal of goals) {
      // Skip if already reminded recently.
      if (goal.lastStaleReminderAt && now - goal.lastStaleReminderAt < reRemindThreshold) continue;

      // Find the most recent update for this goal.
      const lastUpdate = await ctx.db
        .query("updates")
        .withIndex("by_goal_created", (q) => q.eq("goalId", goal._id))
        .order("desc")
        .first();

      // Stale baseline: last update, or goal createdAt/launchedAt if no updates yet.
      const lastActivity = lastUpdate?.createdAt ?? goal.launchedAt ?? goal.createdAt;
      const elapsed = now - lastActivity;
      if (elapsed < staleThreshold) continue;

      // Count supporters + motivators for social proof.
      const [supporters, motivators] = await Promise.all([
        ctx.db
          .query("supporters")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect(),
        ctx.db
          .query("motivatorPledges")
          .withIndex("by_goal_status", (q) =>
            q.eq("goalId", goal._id).eq("status", "active")
          )
          .collect(),
      ]);

      const entry = byOwner.get(goal.ownerId);
      const goalData = {
        goalId: goal._id,
        title: goal.title,
        slug: goal.slug,
        daysSinceLastUpdate: Math.floor(elapsed / DAY),
        supporterCount: supporters.length,
        motivatorCount: motivators.length,
      };
      if (entry) {
        entry.goals.push(goalData);
      } else {
        byOwner.set(goal.ownerId, {
          ownerId: goal.ownerId,
          goals: [goalData],
        });
      }
    }

    // Hydrate owner info.
    const result = [];
    for (const [ownerId, data] of byOwner) {
      const owner = await ctx.db.get(ownerId);
      if (!owner?.email) continue;
      result.push({
        ownerId,
        email: owner.email,
        name: owner.name ?? owner.handle ?? "there",
        goals: data.goals,
      });
    }
    return result;
  },
});

/**
 * Find active goals where the target date is 3 days away (or 1 day away).
 * Returns goal data + owner info for the "deadline approaching" email.
 */
export const listDeadlineApproaching = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const threeDays = 3 * DAY;
    const oneDay = 1 * DAY;

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) =>
        q.eq("visibility", "public").eq("status", "active")
      )
      .collect();

    const result = [];
    for (const goal of goals) {
      if (!goal.targetDate) continue;

      const timeUntil = goal.targetDate - now;
      // Fire at the 3-day and 1-day marks.
      const isThreeDay = timeUntil <= threeDays && timeUntil > 2 * DAY;
      const isOneDay = timeUntil <= oneDay && timeUntil > 0;
      if (!isThreeDay && !isOneDay) continue;

      // Skip if already warned for this window.
      if (goal.lastDeadlineWarningAt) {
        const since = now - goal.lastDeadlineWarningAt;
        if (isThreeDay && since < 2 * DAY) continue; // don't double-fire before 1-day mark
        if (isOneDay && since < DAY) continue;
      }

      const owner = await ctx.db.get(goal.ownerId);
      if (!owner?.email) continue;

      const progressPct = computeProgress(
        goal.startValue ?? 0,
        goal.currentValue ?? 0,
        goal.targetValue ?? 0,
        goal.direction ?? "increase"
      );

      result.push({
        goalId: goal._id,
        ownerId: goal.ownerId,
        email: owner.email,
        ownerName: owner.name ?? owner.handle ?? "there",
        goalTitle: goal.title,
        goalSlug: goal.slug,
        daysRemaining: isThreeDay ? 3 : 1,
        currentValue: goal.currentValue ?? 0,
        targetValue: goal.targetValue,
        unit: goal.unit,
        progressPct,
      });
    }
    return result;
  },
});

/**
 * Find active goals where the target date has passed but the goal isn't completed.
 * Only fires once per goal (deadlinePassedNotified flag).
 */
export const listDeadlinePassed = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) =>
        q.eq("visibility", "public").eq("status", "active")
      )
      .collect();

    const result = [];
    for (const goal of goals) {
      if (!goal.targetDate) continue;
      if (goal.targetDate >= now) continue; // not past yet
      if (goal.deadlinePassedNotified) continue; // already notified

      const owner = await ctx.db.get(goal.ownerId);
      if (!owner?.email) continue;

      const progressPct = computeProgress(
        goal.startValue ?? 0,
        goal.currentValue ?? 0,
        goal.targetValue ?? 0,
        goal.direction ?? "increase"
      );

      result.push({
        goalId: goal._id,
        ownerId: goal.ownerId,
        email: owner.email,
        ownerName: owner.name ?? owner.handle ?? "there",
        goalTitle: goal.title,
        goalSlug: goal.slug,
        daysOverdue: Math.floor((now - goal.targetDate) / DAY),
        currentValue: goal.currentValue ?? 0,
        targetValue: goal.targetValue,
        unit: goal.unit,
        progressPct,
      });
    }
    return result;
  },
});

/** Stamp a goal as stale-reminded. */
export const markStaleReminded = internalMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    await ctx.db.patch(goalId, { lastStaleReminderAt: Date.now() });
  },
});

/** Stamp a goal as deadline-warned. */
export const markDeadlineWarned = internalMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    await ctx.db.patch(goalId, { lastDeadlineWarningAt: Date.now() });
  },
});

/** Stamp a goal as deadline-passed-notified (permanent flag). */
export const markDeadlinePassedNotified = internalMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    await ctx.db.patch(goalId, { deadlinePassedNotified: true });
  },
});

/** Reset stale reminder timestamp when owner posts an update. */
export const resetStaleReminder = internalMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    await ctx.db.patch(goalId, { lastStaleReminderAt: undefined });
  },
});
