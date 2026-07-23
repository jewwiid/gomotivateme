// @ts-nocheck — see convex/goals.ts header.
/**
 * Scheduled jobs. Convex auto-discovers this file as convex/crons.ts.
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

export default cronJobs({
  drainEmails: {
    cron: "*/2 * * * *",
    fn: internal.emailsActions.drainQueue,
  },
  purgeNotifications: {
    cron: "0 3 * * *",
    fn: internal.emails.purgeOld,
  },
  sendDigests: {
    cron: "0 9 * * 1",
    fn: internal.emailsActions.sendWeeklyDigests,
  },
  checkInReminders: {
    cron: "0 10 * * *",
    fn: internal.emailsActions.sendCheckInReminders,
  },
  // Accountability — daily at 11:00 UTC
  staleGoalReminders: {
    cron: "0 11 * * *",
    fn: internal.emailsActions.sendStaleGoalReminders,
  },
  // Accountability — daily at 12:00 UTC
  deadlineApproaching: {
    cron: "0 12 * * *",
    fn: internal.emailsActions.sendDeadlineApproaching,
  },
  // Accountability — daily at 13:00 UTC
  deadlinePassed: {
    cron: "0 13 * * *",
    fn: internal.emailsActions.sendDeadlinePassed,
  },
});
