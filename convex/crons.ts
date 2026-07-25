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

crons.cron("checkInReminders", "0 10 * * *", internal.emailsActions.sendCheckInReminders, {});

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

export default crons;
