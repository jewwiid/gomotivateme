# Convex Cron Patterns for Email

> How to wire scheduled emails (digests, re-engagement, inactivity nudges)
> using Convex's built-in `crons` API. These run on the Convex deployment,
> no external scheduler needed.

## The `crons` API

In `convex/crons.ts` (or wherever the project's cron config lives):

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekly digest — Monday 8am UTC (= 9am BST / 8am GMT / midnight PT)
// Adjust to user's local timezone? NO — too complex. Just pick a
// reasonable UTC hour and let users tolerate the off-by-a-few-hours.
crons.weekly(
  "weekly-digest",
  { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 },
  internal.email.crons.sendWeeklyDigests
);

// Re-engagement: daily at 14:00 UTC — picks up users inactive 7d / 30d / 90d
crons.daily(
  "re-engagement-scan",
  { hourUTC: 14, minuteUTC: 0 },
  internal.email.crons.sendReEngagement
);

// Inactivity nudges: daily at 18:00 UTC
crons.daily(
  "inactivity-scan",
  { hourUTC: 18, minuteUTC: 0 },
  internal.email.crons.sendInactivityNudges
);

// Check-in reminders: daily at 09:00 UTC
crons.daily(
  "check-in-scan",
  { hourUTC: 9, minuteUTC: 0 },
  internal.email.crons.sendCheckInReminders
);

export default crons;
```

## The pattern: scan → batch → send

For each scheduled email type, the worker has three phases:

### 1. SCAN: find the recipients

A Convex `internalQuery` that finds users who should get this email NOW.

Examples:
- **Weekly digest**: users with `userEmailPrefs.digest = true` AND who have at
  least one goal owned in the last 7 days.
- **Re-engagement (7d)**: users with `lastSeenAt < now - 7d` AND no email sent
  in the last 7 days.
- **Inactivity nudge**: owners whose goals have had no `updates` in 14+ days.
- **Check-in reminder**: motivators whose `motivatorPledges.nextCheckInAt < now`.

### 2. BATCH: chunk and rate-limit

Convex actions have a 10-minute timeout. For 10k users at 200ms per Resend
call, that's ~33 min — too long. The pattern:

```ts
// convex/email/crons.ts
export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const RECIPIENTS_PER_RUN = 500;  // safe under 10min
    const recipients = await ctx.runQuery(
      internal.email.queries.findWeeklyDigestRecipients,
      { limit: RECIPIENTS_PER_RUN }
    );

    for (const user of recipients) {
      try {
        await ctx.runAction(internal.email.send.send, {
          userId: user._id,
          emailType: "weekly-digest",
          to: user.email,
          // ... template-specific data
        });
      } catch (e) {
        // Log and continue — one bad user shouldn't kill the run
        console.error(`[digest] failed for user ${user._id}:`, e);
      }
    }
  }
});
```

For a large user base, you'd run multiple batches per day:
```ts
crons.weekly(
  "weekly-digest-batch-1",
  { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 },
  internal.email.crons.sendWeeklyDigestsBatch
);
crons.weekly(
  "weekly-digest-batch-2",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.email.crons.sendWeeklyDigestsBatch
);
// ... etc
```

The query is idempotent (only returns users who haven't been emailed yet this
week), so duplicate runs are safe.

### 3. TRACK: don't email twice

A common bug: cron fires Monday 8am, takes 30 min, then fires Monday 9am
(because we set up batches), and re-emails everyone.

**Solution**: write a sentinel `emailEvents` row when a user gets an email.
The query `findWeeklyDigestRecipients` filters out users with a `weekly-digest`
event in the last 7 days.

```ts
// convex/email/queries.ts
export const findWeeklyDigestRecipients = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // All users who opted in
    const optedIn = await ctx.db
      .query("userEmailPrefs")
      .withIndex("userId")
      .filter(q => q.and(
        q.eq(q.field("digest"), true),
        q.neq(q.field("emailBounced"), true)
      ))
      .take(limit);

    // Exclude those already emailed this week
    const recent = await ctx.db
      .query("emailEvents")
      .withIndex("emailType", q => q.eq("emailType", "weekly-digest"))
      .filter(q => q.gt(q.field("sentAt"), sevenDaysAgo))
      .collect();
    const recentUserIds = new Set(recent.map(e => e.userId));

    return Promise.all(
      optedIn
        .filter(p => !recentUserIds.has(p.userId))
        .map(p => ctx.db.get(p.userId))
    ).then(users => users.filter(Boolean));
  }
});
```

## Idempotency rules

For each scheduled email, document its idempotency strategy:

| Email | Idempotency |
|---|---|
| Weekly digest (B14) | Skip if `emailEvents` has `weekly-digest` for this user in last 7d |
| Re-engagement 7d (F2) | Skip if user has any email in last 7d |
| Re-engagement 30d (F3) | Skip if F2 was sent in last 23d, OR any email in last 7d |
| Inactivity nudge (B12) | Skip if a `goal-inactivity` email was sent for this goal in last 7d |
| Check-in reminder (C5) | Skip if `motivatorPledge.lastCheckInReminderAt` is within the last 3 days |

## What NOT to do with crons

❌ Don't call Resend directly from a cron. Always go through
`internal.email.send` — it's where the opt-out / bounce checks live.

❌ Don't put per-user data fetching in a cron — cron args are limited.
Always have the cron call a `query` that returns the recipients + their
pre-computed data, then iterate.

❌ Don't assume a single cron invocation handles all recipients. For
1k+ users, split into batches across multiple crons.

## Debugging

When something goes wrong:
1. Check `emailEvents` for the affected user — see status + last error
2. Check Resend dashboard for delivery stats + bounces
3. Re-trigger manually: `npx convex run email:send '{"userId": "...", "emailType": "weekly-digest", "to": "..."}'`

The internal action `internal.email.send` is callable from CLI for debugging
without going through the cron.
