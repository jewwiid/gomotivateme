import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DAY_MS = 86_400_000;

function safeOffset(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-840, Math.min(840, Math.round(value ?? 0)));
}

function dayKey(timestamp: number, offsetMinutes: number) {
  return new Date(timestamp - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function progressPercent(
  start: number,
  current: number,
  target: number,
  direction: "increase" | "decrease"
) {
  const total = direction === "decrease" ? start - target : target - start;
  if (total <= 0) return 0;
  const moved = direction === "decrease" ? start - current : current - start;
  return Math.max(0, Math.min(100, Math.round((moved / total) * 100)));
}

/** Owner-facing seven-day recap, including quiet weeks (unlike the email digest). */
export const weeklySummary = query({
  args: { tzOffsetMinutes: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.object({
      since: v.number(),
      through: v.number(),
      days: v.array(v.object({ key: v.string(), count: v.number() })),
      updatesPosted: v.number(),
      activeDays: v.number(),
      goalsMoved: v.number(),
      peopleShowingUp: v.number(),
      messagesReceived: v.number(),
      checkInsReceived: v.number(),
      newSupporters: v.number(),
      achievementsEarned: v.number(),
      milestonesReached: v.number(),
      leadingStreak: v.union(
        v.null(),
        v.object({
          goalId: v.id("goals"),
          title: v.string(),
          current: v.number(),
          best: v.number(),
          loggedToday: v.boolean(),
        })
      ),
      topGoal: v.union(
        v.null(),
        v.object({
          goalId: v.id("goals"),
          title: v.string(),
          updates: v.number(),
          progressPct: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, { tzOffsetMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const offset = safeOffset(tzOffsetMinutes);
    const now = Date.now();
    const localTodayStart = Math.floor((now - offset * 60_000) / DAY_MS) * DAY_MS;
    const since = localTodayStart + offset * 60_000 - 6 * DAY_MS;
    const days = Array.from({ length: 7 }, (_, index) => {
      const timestamp = since + index * DAY_MS;
      return { key: dayKey(timestamp, offset), count: 0 };
    });
    const byDay = new Map(days.map((day) => [day.key, day]));

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .collect();

    let updatesPosted = 0;
    let messagesReceived = 0;
    let checkInsReceived = 0;
    let newSupporters = 0;
    const goalsMoved = new Set<string>();
    const goalActivity: Array<{
      goalId: (typeof goals)[number]["_id"];
      title: string;
      updates: number;
      progressPct: number;
    }> = [];

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
        ctx.db
          .query("supporters")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect(),
      ]);

      const liveUpdates = updates.filter((update) => !update.revertedAt);
      updatesPosted += liveUpdates.length;
      messagesReceived += messages.length;
      checkInsReceived += checkIns.length;
      newSupporters += supporters.filter((supporter) => supporter.createdAt >= since).length;
      if (liveUpdates.length > 0) {
        goalsMoved.add(goal._id);
        goalActivity.push({
          goalId: goal._id,
          title: goal.title,
          updates: liveUpdates.length,
          progressPct: progressPercent(
            goal.startValue ?? 0,
            goal.currentValue ?? 0,
            goal.targetValue,
            goal.direction
          ),
        });
      }

      for (const update of liveUpdates) {
        const bucket = byDay.get(dayKey(update.createdAt, offset));
        if (bucket) bucket.count += 1;
      }
    }

    const streakGoals = goals
      .filter((goal) => goal.progressType === "streak")
      .map((goal) => {
        const goalOffset = safeOffset(goal.streakTimezoneOffsetMinutes ?? offset);
        const today = dayKey(now, goalOffset);
        const yesterday = dayKey(now - DAY_MS, goalOffset);
        const isAlive =
          goal.streakLastLoggedDay === today || goal.streakLastLoggedDay === yesterday;
        return {
          goalId: goal._id,
          title: goal.title,
          current: isAlive ? goal.currentValue ?? 0 : 0,
          best: goal.streakBest ?? goal.currentValue ?? 0,
          loggedToday: goal.streakLastLoggedDay === today,
        };
      })
      .sort((a, b) => b.current - a.current || b.best - a.best);

    const recentAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_owner_awarded", (q) =>
        q.eq("ownerId", userId).gte("awardedAt", since)
      )
      .collect();

    const milestonesReached = goals.reduce(
      (total, goal) =>
        total +
        (goal.milestones?.filter(
          (milestone) =>
            milestone.done &&
            milestone.completedAt !== undefined &&
            milestone.completedAt >= since
        ).length ?? 0),
      0
    );
    const topGoal =
      goalActivity.sort((a, b) => b.updates - a.updates || b.progressPct - a.progressPct)[0] ??
      null;

    return {
      since,
      through: now,
      days,
      updatesPosted,
      activeDays: days.filter((day) => day.count > 0).length,
      goalsMoved: goalsMoved.size,
      peopleShowingUp: messagesReceived + checkInsReceived + newSupporters,
      messagesReceived,
      checkInsReceived,
      newSupporters,
      achievementsEarned: recentAchievements.length,
      milestonesReached,
      leadingStreak: streakGoals[0] ?? null,
      topGoal,
    };
  },
});

/**
 * Owner-only calendar-year recap used by the full-screen "Year in motion"
 * story. The client supplies exact local-year boundaries so New Year's Eve
 * activity is assigned using the owner's browser timezone.
 */
export const yearlySummary = query({
  args: {
    year: v.number(),
    startMs: v.number(),
    endMs: v.number(),
    tzOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { year, startMs, endMs, tzOffsetMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      throw new Error("Choose a valid recap year");
    }
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new Error("Choose a valid recap period");
    }

    const offset = safeOffset(tzOffsetMinutes);
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .collect();

    const activeDayKeys = new Set<string>();
    const movedGoalIds = new Set<string>();
    const monthCounts = Array.from({ length: 12 }, () => 0);
    const goalActivity: Array<{
      goalId: (typeof goals)[number]["_id"];
      title: string;
      updates: number;
      progressPct: number;
    }> = [];

    let updatesPosted = 0;
    let messagesReceived = 0;
    let checkInsReceived = 0;
    let newSupporters = 0;

    for (const goal of goals) {
      const [updates, messages, checkIns, supporters] = await Promise.all([
        ctx.db
          .query("updates")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", startMs).lt("createdAt", endMs)
          )
          .collect(),
        ctx.db
          .query("supportMessages")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", startMs).lt("createdAt", endMs)
          )
          .collect(),
        ctx.db
          .query("checkIns")
          .withIndex("by_goal_created", (q) =>
            q.eq("goalId", goal._id).gte("createdAt", startMs).lt("createdAt", endMs)
          )
          .collect(),
        ctx.db
          .query("supporters")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect(),
      ]);

      const liveUpdates = updates.filter((update) => !update.revertedAt);
      const visibleMessages = messages.filter(
        (message) => !message.hiddenAt && message.moderationStatus !== "rejected"
      );
      const supportersInPeriod = supporters.filter(
        (supporter) => supporter.createdAt >= startMs && supporter.createdAt < endMs
      );

      updatesPosted += liveUpdates.length;
      messagesReceived += visibleMessages.length;
      checkInsReceived += checkIns.length;
      newSupporters += supportersInPeriod.length;

      if (liveUpdates.length > 0) movedGoalIds.add(goal._id);
      for (const update of liveUpdates) {
        activeDayKeys.add(dayKey(update.createdAt, offset));
        const localMonth = new Date(update.createdAt - offset * 60_000).getUTCMonth();
        monthCounts[localMonth] += 1;
      }

      if (liveUpdates.length > 0) {
        goalActivity.push({
          goalId: goal._id,
          title: goal.title,
          updates: liveUpdates.length,
          progressPct: progressPercent(
            goal.startValue ?? 0,
            goal.currentValue ?? 0,
            goal.targetValue,
            goal.direction
          ),
        });
      }
    }

    const [achievements, badges] = await Promise.all([
      ctx.db
        .query("achievements")
        .withIndex("by_owner_awarded", (q) =>
          q.eq("ownerId", userId).gte("awardedAt", startMs).lt("awardedAt", endMs)
        )
        .collect(),
      Promise.all(
        goals.map((goal) =>
          ctx.db
            .query("badges")
            .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
            .collect()
        )
      ),
    ]);

    const badgesEarned = badges
      .flat()
      .filter((badge) => badge.awardedAt >= startMs && badge.awardedAt < endMs).length;
    const milestonesReached = goals.reduce(
      (total, goal) =>
        total +
        (goal.milestones?.filter(
          (milestone) =>
            milestone.done &&
            milestone.completedAt !== undefined &&
            milestone.completedAt >= startMs &&
            milestone.completedAt < endMs
        ).length ?? 0),
      0
    );
    const goalsCompleted = goals.filter(
      (goal) =>
        goal.completedAt !== undefined &&
        goal.completedAt >= startMs &&
        goal.completedAt < endMs
    ).length;
    const goalsStarted = goals.filter(
      (goal) => goal.createdAt >= startMs && goal.createdAt < endMs
    ).length;

    const topGoal = goalActivity.sort(
      (a, b) => b.updates - a.updates || b.progressPct - a.progressPct
    )[0] ?? null;
    const topMonthIndex = monthCounts.reduce(
      (best, count, index, counts) => (count > counts[best] ? index : best),
      0
    );
    const monthLabels = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const bestStreak = achievements
      .filter((achievement) => achievement.kind === "streak")
      .reduce((best, achievement) => Math.max(best, achievement.value), 0);

    return {
      year,
      startMs,
      endMs,
      updatesPosted,
      activeDays: activeDayKeys.size,
      goalsMoved: movedGoalIds.size,
      goalsStarted,
      goalsCompleted,
      milestonesReached,
      achievementsEarned: achievements.length,
      badgesEarned,
      messagesReceived,
      checkInsReceived,
      newSupporters,
      peopleShowingUp: messagesReceived + checkInsReceived + newSupporters,
      bestStreak,
      topGoal,
      mostActiveMonth:
        monthCounts[topMonthIndex] > 0
          ? { label: monthLabels[topMonthIndex], updates: monthCounts[topMonthIndex] }
          : null,
      months: monthLabels.map((label, index) => ({ label, updates: monthCounts[index] })),
    };
  },
});
