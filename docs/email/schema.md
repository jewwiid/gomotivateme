# Email Schema

> Convex tables needed to support the email system.
> Add these to `convex/schema.ts` when we start the build.

## `userEmailPrefs` (per-user opt-out table)

Why a separate table and not a field on `users`:
- Smaller documents = cheaper reads
- Can be added without migrating the (large) `users` table
- Easier to add new flag types without redeploying

```ts
// In convex/schema.ts
userEmailPrefs: defineTable({
  userId: v.id("users"),

  // Transactional (we never let users turn these off — they only block
  // optional categories). Adding a category means adding a new bool.
  digest: v.boolean(),           // B14 weekly digest
  goalUpdates: v.boolean(),      // C4 new update on a goal you motivate
  supportMessages: v.boolean(),  // B6 new message on a goal you own
  goalLaunched: v.boolean(),     // B9 (or B5 supporter equivalent)
  goalHitTarget: v.boolean(),    // B11
  checkInReminders: v.boolean(), // C5
  applicationStatus: v.boolean(),// B2
  newMotivatorApplication: v.boolean(), // B1
  inviteFromOwner: v.boolean(),   // C1

  // Lifecycle / marketing
  marketing: v.boolean(),        // F1, F6, F7
  reEngagement: v.boolean(),     // F2, F3, F4
  tips: v.boolean(),             // F6 educational

  // Internal
  emailBounced: v.boolean(),     // hard bounce → skip everything
  spamComplaint: v.boolean(),    // any spam report → skip marketing
  unsubscribeToken: v.string(),  // signed token for unsub links
})
  .index("userId", ["userId"]),
```

**Defaults** — when a row is first created (e.g., right after signup), default
all to `true` so the user is opted in to everything. They can opt out from the
settings page.

**`emailBounced` and `spamComplaint` are write-only by the system** — never
exposed to the user.

## `emailEvents` (delivery tracking)

```ts
emailEvents: defineTable({
  userId: v.optional(v.id("users")),  // optional — admin emails have no user
  emailType: v.string(),               // e.g. "welcome", "goal-launched"
  to: v.string(),                     // email address
  from: v.string(),                   // which sender (tx / lifecycle / alerts)
  resendId: v.optional(v.string()),   // Resend's email id, for webhook lookups
  status: v.union(
    v.literal("queued"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("opened"),
    v.literal("clicked"),
    v.literal("bounced"),
    v.literal("complained"),
    v.literal("failed"),
    v.literal("skipped_opted_out"),
    v.literal("skipped_bounced"),
    v.literal("skipped_complained"),
  ),
  subject: v.string(),                // for debugging
  metadata: v.optional(v.object({
    goalId: v.optional(v.id("goals")),
    motivatorId: v.optional(v.id("motivatorPledges")),
    supporterId: v.optional(v.id("supporters")),
    messageId: v.optional(v.id("supportMessages")),
  })),
  errorMessage: v.optional(v.string()),
  sentAt: v.number(),                 // ms
  deliveredAt: v.optional(v.number()),
  openedAt: v.optional(v.number()),
  clickedAt: v.optional(v.number()),
  bouncedAt: v.optional(v.number()),
})
  .index("userId", ["userId"])
  .index("resendId", ["resendId"])
  .index("emailType", ["emailType"])
  .index("status", ["status"])
  .index("sentAt", ["sentAt"]),
```

Used for:
- Bounce/complaint webhook lookups (by `resendId`)
- Per-user email history view in admin tools
- Weekly deliverability dashboards

## `emailQueue` (optional — for rate limiting / batching)

Only if we need rate limiting. Resend already has a sane default, so this
is probably unnecessary. Mentioning for completeness:

```ts
emailQueue: defineTable({
  emailType: v.string(),
  to: v.string(),
  userId: v.optional(v.id("users")),
  payload: v.string(),                 // JSON-stringified
  scheduledFor: v.number(),            // when to send
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("sent"),
    v.literal("failed"),
  ),
  attempts: v.number(),
  lastError: v.optional(v.string()),
})
  .index("scheduledFor", ["scheduledFor", "status"]),
```

For MVP, we send synchronously from Convex actions — the queue table
becomes valuable only when we add throttling rules (e.g., "max 1 digest
per user per week, ever" or "max 5 emails per user per day").

## Schema deltas (add to existing schema.ts)

```ts
// Add to defineSchema({...}) in convex/schema.ts:

userEmailPrefs: defineTable({...}).index("userId", ["userId"]),
emailEvents: defineTable({...}).index(...).index(...).index(...).index(...).index(...),
// optional:
// emailQueue: defineTable({...}).index(...),
```

## Convex functions to add

```ts
// convex/email/prefs.ts
export const get = internalQuery({ args: { userId: v.id("users") }, ... });
export const getForCurrentUser = query({ args: {}, ... });        // for settings page
export const update = mutation({                                 // from settings page
  args: { userId: v.id("users"), patch: v.object({...}) },
  ...
});
export const unsubscribe = publicMutation({                       // from /api/email/unsubscribe
  args: { token: v.string(), type: v.string() },
  ...
});
export const markBounced = internalMutation({ ... });             // from webhook
export const markComplained = internalMutation({ ... });          // from webhook
export const ensureCreated = internalMutation({ ... });           // called right after signup

// convex/email/send.ts
export const send = internalAction({                              // the only email sender
  args: { userId: v.optional(v.id("users")), emailType: v.string(), to: v.string(), ... },
  handler: async (ctx, args) => {
    // 1. fetch prefs, decide whether to skip
    // 2. render template
    // 3. call Resend
    // 4. write to emailEvents
  }
});

// convex/email/events.ts
export const webhook = publicAction({ ... });                     // POST /api/email/webhook
export const updateStatus = internalMutation({ ... });            // called by webhook

// convex/email/crons.ts
export const sendDigests = internalAction({ ... });               // weekly B14 + C9
export const sendReEngagement = internalAction({ ... });          // F2, F3, F4
export const sendInactivityNudges = internalAction({ ... });      // B12
export const sendCheckInReminders = internalAction({ ... });      // C5
```

## Migration order

1. Add `userEmailPrefs` + `emailEvents` to schema, deploy
2. `convex/email/prefs.ts` + `lib/email/send.ts` skeleton
3. `convex/email/send.ts` internal action
4. Wire first template (Welcome = A1)
5. Call `users.ensureEmailPrefs` from signup action
6. Iterate from there
