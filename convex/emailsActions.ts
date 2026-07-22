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
        const { subject, component } = renderTemplate(
          notification.templateId,
          JSON.parse(notification.payload)
        );
        const html = await render(component);

        const result = await client.emails.send({
          from: fromAddress,
          to: notification.toEmail,
          subject,
          html,
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
