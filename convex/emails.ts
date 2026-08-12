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

type LifecyclePreferenceKey =
  | "goalActivity"
  | "motivationActivity"
  | "socialActivity"
  | "accountActivity"
  | "goalUpdates"
  | "weeklyDigest"
  | "dailyStreakReminder"
  | "goalUpdateReminder"
  | "deadlineReminders"
  | "platformDigest"
  | "urgentCauses"
  | "productUpdates";

const lifecyclePreferenceValidator = v.union(
  v.literal("goalActivity"),
  v.literal("motivationActivity"),
  v.literal("socialActivity"),
  v.literal("accountActivity"),
  v.literal("goalUpdates"),
  v.literal("weeklyDigest"),
  v.literal("dailyStreakReminder"),
  v.literal("goalUpdateReminder"),
  v.literal("deadlineReminders"),
  v.literal("platformDigest"),
  v.literal("urgentCauses"),
  v.literal("productUpdates")
);

function hasEnabledLifecyclePreference(
  prefs: Record<string, any>,
  preferenceKey: LifecyclePreferenceKey
) {
  if (preferenceKey === "goalUpdates") {
    return prefs.yourMotivations !== false || prefs.supportedGoalUpdates !== false;
  }
  if (preferenceKey === "goalUpdateReminder") {
    return (prefs.goalUpdateReminderCadence ?? "weekly") !== "off";
  }
  if (preferenceKey === "platformDigest") {
    return (prefs.platformDigestCadence ?? "off") !== "off";
  }
  return prefs[preferenceKey] !== false;
}

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
    preferenceKey: v.optional(lifecyclePreferenceValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { preferenceKey, ...notification } = args;

    // Pref check: suppress lifecycle email to opted-out users.
    if (args.userId && args.category === "lifecycle") {
      const prefs = await ctx.runMutation(internal.notificationPrefs.getForUser, {
        userId: args.userId,
      });
      if (
        prefs?.unsubscribedAll ||
        !preferenceKey ||
        !hasEnabledLifecyclePreference(prefs, preferenceKey)
      ) {
        await ctx.db.insert("notifications", {
          ...notification,
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
    let payload = notification.payload;
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
      ...notification,
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
        ownerHandle: goal.ownerHandle ?? undefined,
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

// =====================================================================
// Consent-only platform discovery marketing
// =====================================================================

const PLATFORM_DIGEST_BLOCKED_CATEGORIES = new Set(["health"]);
const PLATFORM_DIGEST_BLOCKED_MODERATION = new Set([
  "sexual",
  "violence",
  "self_harm",
  "hate",
  "harassment",
]);

/** Marketing recipients are selected only from an explicit settings choice. */
export const listPlatformDigestSubscribers = internalQuery({
  args: { cadence: v.union(v.literal("daily"), v.literal("weekly")) },
  handler: async (ctx, { cadence }) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_platform_digest_cadence", (q) =>
        q.eq("platformDigestCadence", cadence)
      )
      .collect();

    const subscribers = [];
    for (const pref of prefs) {
      if (pref.unsubscribedAll || !pref.platformDigestConsentAt) continue;
      const user = await ctx.db.get(pref.userId);
      if (!user?.email) continue;
      subscribers.push({
        userId: pref.userId,
        email: user.email,
      });
    }
    return subscribers;
  },
});

/**
 * Build a compact Product-Hunt-style discovery email from recently launched,
 * approved public goals. Sensitive categories, anonymous goals, and the
 * recipient's own goals are never used in marketing.
 */
export const getPlatformDigestData = internalQuery({
  args: {
    userId: v.id("users"),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    nowMs: v.optional(v.number()),
  },
  handler: async (ctx, { userId, cadence, nowMs }) => {
    const now = nowMs ?? Date.now();
    const contentPeriodMs = cadence === "daily" ? 26 * 60 * 60 * 1000 : 8 * DAY;
    const dedupePeriodMs = cadence === "daily" ? 20 * 60 * 60 * 1000 : 6 * DAY;
    const contentSince = now - contentPeriodMs;
    const dedupeSince = now - dedupePeriodMs;

    // Idempotency: a rerun or redeploy cannot enqueue the same cadence twice.
    const recentNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId).gte("createdAt", dedupeSince))
      .collect();
    if (
      recentNotifications.some(
        (notification) =>
          notification.templateId === "platformDigest" &&
          notification.status !== "suppressed"
      )
    ) {
      return null;
    }

    const recentPublicGoals = await ctx.db
      .query("goals")
      .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(200);

    const eligible = recentPublicGoals.filter((goal) => {
      const launchedAt = goal.launchedAt ?? goal.createdAt;
      const moderationFlags = goal.moderationCategories ?? [];
      return (
        launchedAt >= contentSince &&
        goal.status === "active" &&
        goal.moderationStatus === "approved" &&
        goal.ownerId !== userId &&
        !goal.isAnonymous &&
        Boolean(goal.ownerHandle) &&
        !PLATFORM_DIGEST_BLOCKED_CATEGORIES.has(goal.category) &&
        !moderationFlags.some((flag) => PLATFORM_DIGEST_BLOCKED_MODERATION.has(flag))
      );
    });

    // Lead with variety: select one strong recent goal per category, then fill.
    eligible.sort((a, b) => {
      const aScore = (a.supporterCount ?? 0) * 4 + (a.launchedAt ?? a.createdAt) / 1e12;
      const bScore = (b.supporterCount ?? 0) * 4 + (b.launchedAt ?? b.createdAt) / 1e12;
      return bScore - aScore;
    });
    const chosen: typeof eligible = [];
    const usedCategories = new Set<string>();
    for (const goal of eligible) {
      if (usedCategories.has(goal.category)) continue;
      chosen.push(goal);
      usedCategories.add(goal.category);
      if (chosen.length === (cadence === "daily" ? 4 : 6)) break;
    }
    for (const goal of eligible) {
      if (chosen.some((candidate) => candidate._id === goal._id)) continue;
      chosen.push(goal);
      if (chosen.length === (cadence === "daily" ? 4 : 6)) break;
    }
    if (chosen.length === 0) return null;

    const user = await ctx.db.get(userId);
    const goals = chosen.map((goal) => ({
      title: goal.title,
      summary: goal.summary?.slice(0, 180) ?? "A new goal looking for encouragement.",
      category: goal.category,
      slug: goal.slug,
      ownerHandle: goal.ownerHandle!,
      ownerName: goal.ownerName ?? goal.ownerHandle ?? "A goal creator",
      supporterCount: goal.supporterCount ?? 0,
      progressPct: computeProgress(
        goal.startValue ?? 0,
        goal.currentValue ?? 0,
        goal.targetValue ?? 0,
        goal.direction ?? "increase"
      ),
    }));

    return {
      firstName: user?.name?.split(" ")[0] ?? undefined,
      cadence,
      goals,
      totalNewGoals: eligible.length,
    };
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
        ownerHandle: goal.ownerHandle ?? undefined,
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
// Owner daily-streak reminders
// =====================================================================

const STREAK_DAY_MS = 86_400_000;

function streakDayKey(timestamp: number, offsetMinutes: number) {
  return new Date(timestamp - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Find streak goals whose owner's local reminder hour has arrived. */
export const listDueStreakReminders = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const goals = await ctx.db.query("goals").collect();
    const due = [];

    for (const goal of goals) {
      if (goal.status !== "active" || goal.progressType !== "streak") continue;

      const offset = Math.max(
        -840,
        Math.min(840, Math.round(goal.streakTimezoneOffsetMinutes ?? 0))
      );
      const localNow = new Date(now - offset * 60_000);
      const today = localNow.toISOString().slice(0, 10);
      const reminderHour = Math.max(0, Math.min(23, goal.streakReminderHour ?? 19));
      if (localNow.getUTCHours() !== reminderHour) continue;
      if (goal.streakLastLoggedDay === today || goal.streakLastReminderDay === today) continue;

      // Legacy streak rows may not have a stored day yet. Avoid a false nudge
      // if they already logged a value during this local calendar day.
      if (!goal.streakLastLoggedDay) {
        const todayStart =
          Math.floor((now - offset * 60_000) / STREAK_DAY_MS) * STREAK_DAY_MS +
          offset * 60_000;
        const todayUpdates = await ctx.db
          .query("updates")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", todayStart)
          )
          .collect();
        if (todayUpdates.some((update) => update.type === "value" && !update.revertedAt)) {
          continue;
        }
      }

      const prefs = await ctx.db
        .query("notificationPrefs")
        .withIndex("by_user", (q) => q.eq("userId", goal.ownerId))
        .first();
      if (prefs?.unsubscribedAll || prefs?.dailyStreakReminder === false) continue;

      const owner = await ctx.db.get(goal.ownerId);
      if (!owner?.email) continue;

      const yesterday = streakDayKey(now - STREAK_DAY_MS, offset);
      const currentStreak =
        goal.streakLastLoggedDay === yesterday ? goal.currentValue ?? 0 : 0;
      due.push({
        goalId: goal._id,
        ownerId: goal.ownerId,
        ownerEmail: owner.email,
        ownerName: owner.name ?? owner.handle ?? "there",
        goalTitle: goal.title,
        currentStreak,
        bestStreak: goal.streakBest ?? goal.currentValue ?? 0,
        reminderDay: today,
      });
    }

    return due;
  },
});

export const markStreakReminded = internalMutation({
  args: { goalId: v.id("goals"), reminderDay: v.string() },
  handler: async (ctx, { goalId, reminderDay }) => {
    await ctx.db.patch(goalId, { streakLastReminderDay: reminderDay });
  },
});

// =====================================================================
// Accountability queries — stale goals, deadline approaching, deadline passed
// =====================================================================

const DAY = 24 * 60 * 60 * 1000;

/**
 * Find active goals whose owner has chosen a goal-update reminder and has
 * not posted in that cadence window. Groups results by owner so one run can
 * enqueue a reminder for each due goal. The setting supports daily, weekly,
 * or off; existing accounts retain the weekly behaviour by default.
 * Returns { ownerId, email, name, goals: [{title, slug, daysSinceLastUpdate, supporterCount, motivatorCount}] }[]
 */
export const listStaleGoals = internalQuery({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    // Private goals need the same accountability support as public ones.
    const goals = (await ctx.db.query("goals").collect()).filter(
      (goal) => goal.status === "active"
    );

    // Group by owner so we send one email per creator.
    const byOwner = new Map<string, {
      ownerId: any;
      goals: Array<{
        goalId: any;
        title: string;
        slug: string;
        ownerHandle: string | undefined;
        daysSinceLastUpdate: number;
        supporterCount: number;
        motivatorCount: number;
      }>;
    }>();

    for (const goal of goals) {
      const prefs = await ctx.db
        .query("notificationPrefs")
        .withIndex("by_user", (q) => q.eq("userId", goal.ownerId))
        .first();
      const cadence = prefs?.goalUpdateReminderCadence ?? "weekly";
      if (prefs?.unsubscribedAll || cadence === "off") continue;

      const reminderInterval = cadence === "daily" ? DAY : 7 * DAY;

      // Skip if already reminded recently.
      if (goal.lastStaleReminderAt && now - goal.lastStaleReminderAt < reminderInterval) {
        continue;
      }

      // Find the most recent update for this goal.
      const lastUpdate = await ctx.db
        .query("updates")
        .withIndex("by_goal_created", (q) => q.eq("goalId", goal._id))
        .order("desc")
        .first();

      // Stale baseline: last update, or goal createdAt/launchedAt if no updates yet.
      const lastActivity = lastUpdate?.createdAt ?? goal.launchedAt ?? goal.createdAt;
      const elapsed = now - lastActivity;
      if (elapsed < reminderInterval) continue;

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
        ownerHandle: goal.ownerHandle ?? undefined,
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

      // Collect followers (motivators + supporters) so the cron action can
      // fan out deadline-approaching emails to them too. Deduped by userId,
      // excluding the owner. Each entry carries the tier for pref gating.
      const followerMap = new Map<
        string,
        { userId: any; email: string; isMotivator: boolean; isSupporter: boolean }
      >();

      const pledges = await ctx.db
        .query("motivatorPledges")
        .withIndex("by_goal_status", (q) =>
          q.eq("goalId", goal._id).eq("status", "active")
        )
        .collect();
      for (const pledge of pledges) {
        if (pledge.userId === goal.ownerId) continue;
        const u = await ctx.db.get(pledge.userId);
        if (!u?.email) continue;
        const entry = followerMap.get(pledge.userId);
        if (entry) {
          entry.isMotivator = true;
        } else {
          followerMap.set(pledge.userId, {
            userId: pledge.userId,
            email: u.email,
            isMotivator: true,
            isSupporter: false,
          });
        }
      }

      const supporters = await ctx.db
        .query("supporters")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      for (const supporter of supporters) {
        if (supporter.userId === goal.ownerId) continue;
        const u = await ctx.db.get(supporter.userId);
        if (!u?.email) continue;
        const entry = followerMap.get(supporter.userId);
        if (entry) {
          entry.isSupporter = true;
        } else {
          followerMap.set(supporter.userId, {
            userId: supporter.userId,
            email: u.email,
            isMotivator: false,
            isSupporter: true,
          });
        }
      }

      result.push({
        goalId: goal._id,
        ownerId: goal.ownerId,
        email: owner.email,
        ownerName: owner.name ?? owner.handle ?? "there",
        goalTitle: goal.title,
        goalSlug: goal.slug,
        ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
        daysRemaining: isThreeDay ? 3 : 1,
        currentValue: goal.currentValue ?? 0,
        targetValue: goal.targetValue,
        unit: goal.unit,
        progressPct,
        followers: Array.from(followerMap.values()),
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

      // Collect followers (motivators + supporters) so the cron action can
      // fan out deadline-passed emails to them too. Deduped by userId,
      // excluding the owner. Each entry carries the tier for pref gating.
      const followerMap = new Map<
        string,
        { userId: any; email: string; isMotivator: boolean; isSupporter: boolean }
      >();

      const pledges = await ctx.db
        .query("motivatorPledges")
        .withIndex("by_goal_status", (q) =>
          q.eq("goalId", goal._id).eq("status", "active")
        )
        .collect();
      for (const pledge of pledges) {
        if (pledge.userId === goal.ownerId) continue;
        const u = await ctx.db.get(pledge.userId);
        if (!u?.email) continue;
        const entry = followerMap.get(pledge.userId);
        if (entry) {
          entry.isMotivator = true;
        } else {
          followerMap.set(pledge.userId, {
            userId: pledge.userId,
            email: u.email,
            isMotivator: true,
            isSupporter: false,
          });
        }
      }

      const supporters = await ctx.db
        .query("supporters")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      for (const supporter of supporters) {
        if (supporter.userId === goal.ownerId) continue;
        const u = await ctx.db.get(supporter.userId);
        if (!u?.email) continue;
        const entry = followerMap.get(supporter.userId);
        if (entry) {
          entry.isSupporter = true;
        } else {
          followerMap.set(supporter.userId, {
            userId: supporter.userId,
            email: u.email,
            isMotivator: false,
            isSupporter: true,
          });
        }
      }

      result.push({
        goalId: goal._id,
        ownerId: goal.ownerId,
        email: owner.email,
        ownerName: owner.name ?? owner.handle ?? "there",
        goalTitle: goal.title,
        goalSlug: goal.slug,
        ownerHandle: goal.ownerHandle ?? owner?.handle ?? undefined,
        daysOverdue: Math.floor((now - goal.targetDate) / DAY),
        currentValue: goal.currentValue ?? 0,
        targetValue: goal.targetValue,
        unit: goal.unit,
        progressPct,
        followers: Array.from(followerMap.values()),
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
