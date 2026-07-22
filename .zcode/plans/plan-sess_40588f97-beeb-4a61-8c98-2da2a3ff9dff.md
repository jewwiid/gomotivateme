# Email notification system — infra + first 3 emails

## Architecture (the key decision)

Convex mutations run in an isolate runtime and **cannot** import `resend`/`react-email` directly. The standard pattern:

1. **Mutations** (trigger points) enqueue a row in a new `notifications` table — fast, transactional, never blocks the user action.
2. **A Convex action** (`internalAction` with `use node`) drains the queue: renders the React Email template to HTML, calls Resend's HTTP API, marks the row sent/failed.
3. The action is invoked by a **cron** (every ~2 min) OR scheduled immediately via `ctx.scheduler.runAfter(0, ...)` for near-realtime transactional emails.

This keeps email sending out of the request path, gives us retry/failure visibility, and works with the "no API key yet" constraint — the action no-ops gracefully when `RESEND_API_KEY` is unset.

## Dependencies to add
- `resend` (Node SDK — Resend also has a plain fetch API, but the SDK is cleaner and we run it in a `use node` action)
- `react-email` + `@react-email/components` (template authoring)

## New files

### Schema additions (`convex/schema.ts`)
Two new tables:

**`notificationPrefs`** — per-user email preferences (CAN-SPAM/GDPR requirement).
- `userId` (id users), `email` (string, denormalized snapshot)
- `yourMotivations: boolean` (default true) — replaces the settings placeholder toggle
- `newMotivatorOnGoal: boolean` (default true)
- `weeklyDigest: boolean` (default false)
- `urgentCauses: boolean` (default true)
- `productUpdates: boolean` (default false)
- `unsubscribedAll: boolean` (default false) — master opt-out for lifecycle email
- index: `by_user`
- Created lazily on first signup (defaults inserted via a mutation called from the auth flow / a backfill)

**`notifications`** — the send queue / audit log.
- `userId` (id users, nullable — visitor emails rare but possible), `toEmail` (string)
- `templateId` (string — e.g. `"welcome"`, `"newApplication"`, `"inviteReceived"`)
- `payload` (string — JSON blob with template variables)
- `status` (`"pending" | "sent" | "failed" | "suppressed"`)
- `category` (`"transactional" | "lifecycle"`) — drives suppression logic
- `resendId` (string, optional — Resend message id for tracking)
- `error` (string, optional — last failure message)
- `attempts` (number, default 0)
- `createdAt`, `sentAt?`
- indexes: `by_status_created` (for the drain query), `by_user`

### `convex/emails.ts` (new) — the sending layer
- `enqueue(internalMutation)` — writes a notification row. Called from trigger points via `ctx.runMutation(internal.emails.enqueue, {...})`. Checks prefs here: if the category is `lifecycle` and the user has it disabled (or `unsubscribedAll`), writes status `"suppressed"` and returns — no send.
- `drainQueue(internalAction, use node)` — queries pending notifications (batch of ~20), renders each template to HTML via React Email, calls Resend, updates rows to `sent`/`failed`. If `RESEND_API_KEY` is missing, logs and exits (no-op) — emails stay `pending` and will send the moment the key lands.
- `renderTemplate(templateId, payload)` — maps template id → React Email component, returns `{ subject, html, text }`.

### `convex/crons.ts` (new) — the scheduler
```ts
export default crons.cronJobs({
  drainEmails: crons.interval("drain email queue", { seconds: 120 }, internal.emails.drainQueue),
});
```
Convex auto-discovers this file.

### `emails/` (new directory, Next.js side) — React Email templates
- `emails/components/Layout.tsx` — the shared brand shell: off-white bg, wordmark header, cobalt CTA button, footer with unsubscribe + physical address placeholder. All emails inherit this.
- `emails/welcome.tsx` — A1 (Welcome) → fires on signup
- `emails/newApplication.tsx` — B1 (new motivator application) → fires from `motivation.requestApplication`
- `emails/inviteReceived.tsx` — C1 (you're invited to motivate) → fires from `motivation.addInvite`

These use the brand tokens (cobalt `#044dfc`, gold `#feb604`, Plus Jakarta Sans) so emails match the app.

## Trigger wiring (3 emails, end-to-end)

Each trigger point gets one added line — `await ctx.runMutation(internal.emails.enqueue, {...})`:

1. **Welcome (A1)** → in the signup flow. Since Convex Auth creates the user row via `auth:store`, I'll add a scheduled action hook or enqueue from the existing `users.setHandle`/profile setup (first user write). *Or* cleaner: enqueue from a small `onUserCreated` internal mutation. I'll wire it to the first realistic touchpoint and document the exact spot.
2. **New application (B1)** → `convex/motivation.ts:requestApplication` (line ~521, after the `motivatorApplications` insert). Payload: `{ goalTitle, goalSlug, motivatorName, roleLabel, applicationMessage, supportTypes }`. Recipient: `goal.ownerId`.
3. **Invite received (C1)** → `convex/motivation.ts:addInvite` (line ~227, after the `motivatorInvites` insert). Payload: `{ ownerName, goalTitle, inviteMessage, roleLabel, supportTypes, inviteToken }`. Recipient: `invite.email` or `invite.invitedUserId`.

## Unsubscribe system
- On user creation, generate a random `unsubscribeToken` (stored on `users` — one new optional field).
- Every lifecycle email footer includes `https://{SITE_URL}/email/unsubscribe?token={token}`.
- New route `app/email/unsubscribe/page.tsx` → calls `users.unsubscribeByToken` mutation → sets `notificationPrefs.unsubscribedAll = true`.
- Transactional emails (password reset, application notices) are exempt — they always send.

## Settings UI wiring (`app/settings/page.tsx`)
Replace the placeholder `NotificationsTab` local state with real Convex queries/mutations:
- Query `api.notificationPrefs.get` for current prefs
- Mutation `api.notificationPrefs.update` on toggle
- Remove the "placeholder" disclaimer copy

## Env vars (added to `.env.local.example`, NOT set yet)
- `RESEND_API_KEY` — the API key (you'll add when ready)
- `RESEND_FROM_ADDRESS` — default `GoMotivateMe <hello@gomotivateme.com>`
- `NEXT_PUBLIC_SITE_URL` — already exists, reused for unsubscribe links + email CTAs

## Graceful no-op behavior (the "ENVs later" constraint)
`drainQueue` checks for `RESEND_API_KEY` at the top:
```ts
if (!process.env.RESEND_API_KEY) {
  console.log("[emails] RESEND_API_KEY not set — skipping drain, emails remain pending");
  return;
}
```
**Result**: all the code is real and wired. The moment you drop the key into Convex env vars (`npx convex env set RESEND_API_KEY`), queued emails start flowing with zero code changes.

## Verification
- `npm run typecheck` passes
- `npm run build` passes
- `npx convex dev` pushes schema + functions without error
- Triggering `requestApplication` in dev enqueues a `notifications` row with status `pending` (visible in Convex dashboard)
- The drain cron runs, sees no API key, logs the no-op — row stays `pending`

## Not in scope (flagging)
- The remaining 9 MVP emails (password reset, weekly digest, supporter emails, etc.) — same pattern, just more templates. I'll set up the system so adding each one is ~30 min of work.
- Resend webhook for bounce/complaint handling — defer until sending at volume.
- DNS setup (SPF/DKIM/DMARC) — that's in your DNS provider, not code. I'll document the records needed in DEPLOY.md.

## Files touched
**New:** `convex/emails.ts`, `convex/crons.ts`, `convex/notificationPrefs.ts`, `emails/components/Layout.tsx`, `emails/welcome.tsx`, `emails/newApplication.tsx`, `emails/inviteReceived.tsx`, `app/email/unsubscribe/page.tsx`
**Edited:** `convex/schema.ts` (2 tables + 1 field), `convex/motivation.ts` (2 trigger lines), `app/settings/page.tsx` (real prefs), `.env.local.example`, `package.json` (2 deps)