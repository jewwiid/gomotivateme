// @ts-nocheck — see convex/goals.ts header.
/**
 * Scheduled jobs. Convex auto-discovers this file as convex/crons.ts.
 *
 *   drainEmails — every 2 minutes, render + send pending notification rows.
 *                 No-ops gracefully if RESEND_API_KEY isn't set yet.
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

export default cronJobs({
  drainEmails: {
    cron: "*/2 * * * *",
    fn: internal.emailsActions.drainQueue,
  },
});
