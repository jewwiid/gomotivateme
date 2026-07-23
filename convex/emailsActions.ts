// @ts-nocheck — see convex/goals.ts header.
/**
 * Email drain action — runs in the Node runtime (`"use node"`) so it can
 * import `resend` and the React Email templates.
 *
 * Runs on a cron (every ~2 min, registered in convex/crons.ts). Pulls
 * pending notification rows, renders each template to HTML, calls Resend,
 * updates rows to sent/failed via internal mutations in emails.ts.
 *
 * Graceful no-op: if RESEND_API_KEY is not set, logs and returns — rows
 * stay pending and will be picked up once the key is added to Convex env vars.
 */
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Public site URL — used for the List-Unsubscribe header and footer links.
// Matches the default in the email templates.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gomotivateme.com";

export const drainQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(
        "[emails] RESEND_API_KEY not set — skipping drain. Pending emails will send once the key is added."
      );
      return { sent: 0, skipped: "no_api_key" };
    }

    const pending = await ctx.runQuery(internal.emails.getPending, { limit: 20 });
    if (pending.length === 0) return { sent: 0, skipped: "empty" };

    // Lazy-import Node-only deps inside the action.
    const { render } = await import("@react-email/components");
    const { Resend } = await import("resend");
    const { renderTemplate } = await import("../emails/render");

    const client = new Resend(apiKey);
    const fromAddress =
      process.env.RESEND_FROM_ADDRESS ?? "GoMotivateMe <hello@gomotivateme.com>";

    let sent = 0;
    for (const notification of pending) {
      try {
        const payload = JSON.parse(notification.payload);
        const { subject, component } = renderTemplate(notification.templateId, payload);
        const html = await render(component);

        // List-Unsubscribe headers (Gmail/Yahoo 2024 bulk-sender requirement).
        // Only present for user-recipient emails where enqueue injected a token.
        const headers: Record<string, string> = {};
        if (payload.unsubscribeToken) {
          const unsubUrl = `${SITE_URL}/email/unsubscribe?token=${payload.unsubscribeToken}`;
          headers["List-Unsubscribe"] = `<${unsubUrl}>`;
          headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
        }

        const result = await client.emails.send({
          from: fromAddress,
          to: notification.toEmail,
          subject,
          html,
          headers,
        });

        if (result.error) {
          const err =
            typeof result.error === "object" && result.error !== null
              ? JSON.stringify(result.error)
              : String(result.error);
          await ctx.runMutation(internal.emails.markFailed, {
            id: notification._id,
            error: err,
          });
        } else {
          await ctx.runMutation(internal.emails.markSent, {
            id: notification._id,
            resendId: result.data?.id,
          });
          sent++;
        }
      } catch (err: any) {
        await ctx.runMutation(internal.emails.markFailed, {
          id: notification._id,
          error: err?.message ?? String(err),
        });
      }
    }
    return { sent };
  },
});

/**
 * Weekly digest worker (B14). Runs on a Monday cron. For each user opted
 * into weeklyDigest (and not unsubscribedAll), gathers their goal activity
 * for the past 7 days and enqueues one lifecycle email. The existing
 * drainQueue cron then renders + sends those rows.
 *
 * Skips users with no active goals or no activity this week (no empty
 * digests). Uses category "lifecycle" so the suppression machinery gates it.
 */
export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[digests] RESEND_API_KEY not set — skipping.");
      return { enqueued: 0, skipped: "no_api_key" };
    }

    const subscribers = await ctx.runQuery(internal.emails.listDigestSubscribers, {});
    if (subscribers.length === 0) return { enqueued: 0, skipped: "no_subscribers" };

    let enqueued = 0;
    for (const sub of subscribers) {
      const data = await ctx.runQuery(internal.emails.getDigestData, {
        userId: sub.userId,
      });
      if (!data || !data.email) continue; // no goals, no activity, or no email

      await ctx.runMutation(internal.emails.enqueue, {
        userId: sub.userId,
        toEmail: data.email,
        templateId: "weeklyDigest",
        category: "lifecycle",
        payload: JSON.stringify({
          firstName: data.firstName,
          goals: data.goals,
        }),
      });
      enqueued++;
    }
    return { enqueued };
  },
});

/**
 * Daily check-in reminder worker (C5). Finds active pledges where the
 * motivator's chosen cadence (weekly/monthly) has elapsed and they haven't
 * checked in. Sends one reminder per overdue pledge, then stamps
 * lastReminderAt so we don't spam them daily.
 */
export const sendCheckInReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[checkins] RESEND_API_KEY not set — skipping reminders.");
      return { enqueued: 0, skipped: "no_api_key" };
    }

    const due = await ctx.runQuery(internal.emails.listDueCheckIns, {});
    if (due.length === 0) return { enqueued: 0, skipped: "none_due" };

    let enqueued = 0;
    for (const item of due) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: item.motivatorId,
        toEmail: item.motivatorEmail,
        templateId: "checkInDue",
        category: "lifecycle",
        payload: JSON.stringify({
          motivatorName: item.motivatorName,
          ownerName: item.ownerName,
          goalTitle: item.goalTitle,
          goalSlug: item.goalSlug,
          daysSinceLastCheckin: item.daysSinceLastCheckin,
        }),
      });
      // Stamp so we don't remind again until they check in.
      await ctx.runMutation(internal.emails.markPledgeReminded, {
        pledgeId: item.pledgeId,
      });
      enqueued++;
    }
    return { enqueued };
  },
});
