/**
 * Scheduled jobs. Convex auto-discovers this file as convex/crons.ts.
 *
 * NOTE: `cronJobs()` takes no arguments — it returns a registry you then
 * call `.cron()` / `.interval()` / `.daily()` on. Passing a config object
 * to `cronJobs({...})` is silently ignored and registers nothing, which is
 * how every job below sat dormant. Keep this file free of `@ts-nocheck` so
 * the compiler catches that class of mistake.
 *
 *   drainEmails         — every 2 minutes, render + send pending notification
 *                         rows. No-ops gracefully if RESEND_API_KEY isn't set.
 *   purgeNotifications  — daily at 03:00, delete sent/failed/suppressed
 *                         notifications older than 90 days (GDPR Art. 5(1)(e)).
 *   sendDigests         — weekly Monday 09:00 UTC, enqueue a digest email for
 *                         each user opted into weeklyDigest. The first
 *                         lifecycle email — exercises suppression machinery.
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("drainEmails", "*/2 * * * *", internal.emailsActions.drainQueue, {});

crons.cron("purgeNotifications", "0 3 * * *", internal.emails.purgeOld, {});

crons.cron("sendDigests", "0 9 * * 1", internal.emailsActions.sendWeeklyDigests, {});

// Consent-only marketing: daily readers get a short morning discovery list;
// weekly readers get a Sunday roundup, separate from accountability reminders.
crons.cron(
  "dailyPlatformDigest",
  "30 8 * * *",
  internal.emailsActions.sendDailyPlatformDigests,
  {}
);
crons.cron(
  "weeklyPlatformDigest",
  "0 17 * * 0",
  internal.emailsActions.sendWeeklyPlatformDigests,
  {}
);

crons.cron("checkInReminders", "0 10 * * *", internal.emailsActions.sendCheckInReminders, {});

// Hourly so each streak goal can be nudged at 19:00 in the owner's timezone.
crons.cron("streakReminders", "5 * * * *", internal.emailsActions.sendStreakReminders, {});

// Accountability — daily at 11:00 UTC
crons.cron(
  "staleGoalReminders",
  "0 11 * * *",
  internal.emailsActions.sendStaleGoalReminders,
  {}
);

// Accountability — daily at 12:00 UTC
crons.cron(
  "deadlineApproaching",
  "0 12 * * *",
  internal.emailsActions.sendDeadlineApproaching,
  {}
);

// Accountability — daily at 13:00 UTC
crons.cron("deadlinePassed", "0 13 * * *", internal.emailsActions.sendDeadlinePassed, {});

// GitHub activity is factual, deduplicated by commit SHA / pull request number,
// and can be backfilled from each link's chosen start date. AI recaps remain
// user-triggered so a background sync never creates surprise model cost.
crons.cron("syncGitHubGoalActivity", "15 * * * *", internal.github.syncAll, {});

export default crons;
