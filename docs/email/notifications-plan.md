# Email Notifications — Plan

> Master plan for every email gomotivateme will send, organized by recipient
> and lifecycle stage. This is the single source of truth — when we build,
> we refer back here for trigger conditions, copy direction, and ownership.

**Status:** planning (2026-07-22)
**Owner:** product + backend
**Stack when implemented:** Resend + React Email + Convex crons

---

## 1. Recipients (user types)

| Type | What they do |
|---|---|
| **Owner** | Creates + curates a goal |
| **Motivator** | Applied + accepted to support. Has a role: encourage / advice / checkin / join |
| **Supporter** | Joined the goal (lighter than motivator) |
| **Signed-in user** | Has a profile, may or may not have goals |
| **Visitor** | No account |
| **Admin (us)** | Sees system health, abuse |

**Two categories of every email:**
- **Transactional** — required for the product. Cannot opt out. (Welcome, password reset, application received, etc.)
- **Lifecycle** — digest / re-engagement / marketing. Must have unsubscribe per CAN-SPAM / GDPR.

---

## 2. Master Inventory

### A. Account / Identity (transactional)

| # | Email | To | Trigger |
|---|---|---|---|
| A1 | **Welcome** | New user | Right after signup |
| A2 | **Email verification** | New user | Right after signup, with resend |
| A3 | **Password reset** | Anyone | "Forgot password" |
| A4 | **Email change confirmation** | User | They change their email |
| A5 | **New device / location sign-in** | User | Auth detects unusual context |
| A6 | **Account deletion confirmation** | User | They delete (with 30-day grace note) |
| A7 | **Data export ready** | User | They request a GDPR export |

### B. Goal Owner lifecycle (transactional — these ARE the product)

| # | Email | Trigger |
|---|---|---|
| B1 | **New motivator application** | Someone applied to motivate your goal |
| B2 | **Application approved/denied** | Your decision landed (or auto-approval fired) |
| B3 | **New motivator accepted your goal** | They accepted the invite you sent |
| B4 | **Motivator removed themselves** | "I'm stepping back" |
| B5 | **New supporter joined** | Someone joined your goal (light) |
| B6 | **New support message** | Encouragement/advice/checkin/join message landed |
| B7 | **Emoji reaction on your update** | Someone reacted (digest if high volume) |
| B8 | **Pre-launch deadline approaching** | 7 days / 24h before pre-launch cutoff |
| B9 | **Your goal is live** | Launched successfully |
| B10 | **Your goal hit a milestone** | Milestone toggled |
| B11 | **Your goal hit its target** | `currentValue >= targetValue` |
| B12 | **Inactivity nudge** | No update in 7d, 14d, 30d (escalating) |
| B13 | **Streak milestone** | 7 / 30 / 100 days of logging |
| B14 | **Weekly digest** | Monday 8am local — "your goal got X this week" |
| B15 | **Goal auto-closed (past deadline)** | If we add deadlines |

### C. Motivator lifecycle

| # | Email | Trigger |
|---|---|---|
| C1 | **You're invited to motivate** | Owner sent you an invite link |
| C2 | **Your application was approved** | Owner approved you |
| C3 | **Your application was declined** | Owner declined (graceful) |
| C4 | **New update on a goal you motivate** | Owner posted an update |
| C5 | **Your check-in is due** | Scheduled check-in is X overdue |
| C6 | **Goal you motivate hit its target** | Celebration moment |
| C7 | **Goal you motivate was closed/paused** | Owner ended the goal |
| C8 | **Owner removed you** | They removed you from their goal |
| C9 | **Weekly digest** | "3 goals you motivate got new updates this week" |
| C10 | **Conflict / report acknowledged** | Admin got back about a report you filed |

### D. Supporter lifecycle

| # | Email | Trigger |
|---|---|---|
| D1 | **You joined a goal** | Confirmation (immediate) |
| D2 | **Goal you support got a new update** | Owner posted |
| D3 | **Goal you support hit its target** | Celebration |
| D4 | **Goal you support was closed** | Owner closed it |
| D5 | **Your support message was hidden** | Admin took it down (with reason) |

### E. Profile / social

| # | Email | Trigger |
|---|---|---|
| E1 | **Someone followed you** (if we add follows) | New follower |
| E2 | **Profile setup nudge** | Signed up but no handle/avatar/bio (3-stage: 1d, 7d) |
| E3 | **Handle collision** | Rare (probably not needed) |

### F. Re-engagement / Lifecycle (must have unsub)

| # | Email | Trigger |
|---|---|---|
| F1 | **Welcome series** | 3-email: day 0, day 3, day 7 |
| F2 | **You haven't visited in 7d** | Re-engagement #1 |
| F3 | **You haven't visited in 30d** | Re-engagement #2 — softer |
| F4 | **You haven't visited in 90d** | "We're still here" — last touch |
| F5 | **Your dormant goal** | Hasn't been logged in 30d |
| F6 | **Tip of the week** | Educational — how to set a good goal |
| F7 | **New feature announcement** | Product update |
| F8 | **Birthday / goal anniversary** | (only if we collect DOB) |
| F9 | **Year in review** | December — recap of your year |

### G. Admin / system

| # | Email | Trigger |
|---|---|---|
| G1 | **Daily abuse report digest** | Reports from yesterday |
| G2 | **New user milestone** | 100 / 1000 / 10000 users (rare) |
| G3 | **System error spike** | Internal alert |
| G4 | **Storage / cost anomaly** | Internal alert |

**Total: ~50 distinct emails.**

---

## 3. MVP Cut (what to ship first)

### Soft launch (~12 emails, 2-3 weeks)
- A1, A2, A3 (Welcome, Email verify, Password reset)
- B1, B2, B6, B9, B11, B14 (Owner core: applications, support messages, launched, target hit, weekly digest)
- C1, C2, C4, C5 (Motivator core: invite, approved, new update, check-in due)
- D1, D2 (Supporter core: joined, new update)
- E2 (Profile setup nudge)
- F2, F3 (Re-engagement 7d / 30d)

### Phase 2 (~15 more)
- B3, B4, B5, B7, B8, B10, B12, B13, B15
- C3, C6, C7, C8, C9
- D3, D4, D5
- E1
- F1, F4, F5, F6, F7

### Phase 3 (long tail)
- A4, A5, A6, A7
- F8, F9
- G1–G4

---

## 4. Detailed Designs (the 8 to get right first)

Voice: warm, direct, "the friend who actually shows up." No emoji walls, no marketing fluff. Use cobalt + sky + off-white brand.

### A1 — Welcome

> **From:** Jude from gomotivateme `<jude@gomotivateme.com>`
> **Subject:** Welcome — let's set up your first goal
> **Preheader:** 2 minutes now, momentum later.
>
> **Body:**
> Hi {firstName|there},
>
> You just joined gomotivateme. Here's the short version: pick a goal, set a target, invite a few people you trust, and let them keep you moving. No payments, no performative likes — just real encouragement.
>
> **CTA: Start your first goal** (→ /dashboard/new)
>
> Or if you'd rather look around first: **See how it works** (→ /#how-it-works)
>
> — Jude

### B1 — New motivator application

> **Subject:** {motivatorName} wants to support your {goalTitle}
> **Preheader:** Application: {roleLabel}. Accept or pass.
>
> **Body:**
> **{motivatorName}** applied to be your **{roleLabel}** on **{goalTitle}**.
>
> *"{applicationMessage excerpt — first 140 chars}"*
>
> They're offering: {supportTypes as pills}
>
> **CTA: Review application** (→ /o/{slug}/applicants)
>
> You can approve, decline, or just sit on it for a bit. No rush.

### B6 — New support message

> **Subject:** {senderName} left you a note on {goalTitle}
> **Preheader:** "{messagePreview — first 100 chars}"
>
> **Body:**
> *"{full message}"*
>
> — **{senderName}** ({handle})
>
> **CTA: Reply or thank them** (→ /dashboard/{goalId})
>
> (Got noise? You can hide this message from your dashboard anytime.)

### B9 — Your goal is live

> **Subject:** {goalTitle} is live 🎉
> **Preheader:** {supportersCount} people are with you.
>
> **Body:**
> Your goal went live. {supportersCount} people are on your team already.
>
> **Your goal:** {title}
> **Started:** {launchDate}
> **Target:** {targetValue}{unit}
>
> Next: log your first progress update. Smallest step counts.
>
> **CTA: Post your first update** (→ /dashboard/{goalId})

### B11 — Goal hit target 🎉

> **Subject:** You did it — {goalTitle} hit its target
> **Preheader:** {daysToComplete} days. {supportersCount} people were with you.
>
> **Body:**
> {title} hit {targetValue}{unit}. You set the target. They showed up. You did the work.
>
> **A few things you can do now:**
> - **Write a thank-you to your circle** (CTA)
> - **Keep going — set a stretch goal**
> - **Close it out and start something new**
>
> Either way: thank you for letting us be here for it.

### B14 — Weekly digest (owner)

> **Subject:** This week on {goalTitle}
> **Preheader:** {updatesThisWeek} updates · {newSupporters} new supporters · {messages} messages
>
> **Body:**
> **Your goal at a glance**
> {progressBar} {currentValue} / {targetValue}{unit}
>
> **This week:**
> - {updatesThisWeek} updates
> - {newSupporters} new supporters
> - {messages} encouraging messages
> - {checkIns} check-ins from your motivators
>
> **CTA: Open your dashboard** (→ /dashboard/{goalId})

### C1 — You're invited to motivate

> **Subject:** {ownerName} wants you on their team
> **Preheader:** They picked you for {goalTitle}.
>
> **Body:**
> **{ownerName}** is working on **{goalTitle}** and added you as a potential motivator.
>
> *"{inviteMessage excerpt}"*
>
> **The role they're hoping you'll play:** {roleLabel}
> **How you can help:** {supportTypes as pills}
>
> **CTA: Accept invite** (→ /invite/{token})
> **Or decline gracefully** (one-click)

### C5 — Check-in is due

> **Subject:** {ownerName}'s check-in is due
> **Preheader:** They've been going {streakDays} days. A nudge would land right now.
>
> **Body:**
> You signed up to check in with **{ownerName}** on **{goalTitle}**. It's been {daysSinceLastCheckin} days since your last one.
>
> You don't have to write a novel. A single line like "still going?" is enough.
>
> **CTA: Send a quick check-in** (→ /motivate)

---

## 5. Infrastructure Choices

| Decision | Pick | Why |
|---|---|---|
| **Service** | **Resend** | Best DX, React Email native, $20/mo at 50k emails, free tier to start |
| **Templates** | **React Email** (`@react-email/components`) | Renders to HTML, no string concatenation, type-safe |
| **Queue** | **Convex crons** | We already use Convex. `crons.daily("digest", { hourUTC: 13 }, internal.emails.sendDigests)` |
| **Per-user prefs** | Add `user.emailPrefs` table: `digest: bool, goalUpdates: bool, marketing: bool` | Required by CAN-SPAM / GDPR |
| **Unsubscribe link** | Signed token in URL, hits `users.unsubscribe` mutation | No third-party unsub service |
| **Sender domain** | `noreply@gomotivateme.com` for transactional, `hello@gomotivateme.com` for lifecycle | Warmup + reputation separation |
| **DNS** | SPF, DKIM, DMARC records on gomotivateme.com | Required for deliverability |
| **Open/click tracking** | Resend's built-in | Free, no custom infra |
| **Bounce handling** | Resend webhooks → Convex `emailEvents` table | Pause sending on hard bounce |

---

## 6. Open Questions (to decide before building)

1. **Email verification required or optional?** Recommend: **required** (impacts deliverability + prevents fake accounts, but adds friction)
2. **Digest frequency** — weekly only, or daily for high-traffic owners? Recommend: **weekly for MVP, daily opt-in later**
3. **Re-engagement cadence** — 7/30/90, or softer 14/45? Recommend: **7/30/90** — proven curve
4. **Goal owner suppression** — if owner is logging activity daily, do we still send digest? Recommend: **yes, but with "You're crushing it" framing**
5. **Supporters in MVP?** — the data model has them, but are they visible enough to need email? Recommend: **ship D1/D2 only, defer the rest**
6. **Birthday / anniversary** — only if we collect DOB. Recommend: **defer forever** — too much, too creepy

---

## 7. Build Order

1. **Infra** — Resend account, DNS records, env vars, React Email skeleton
2. **Schema** — `user.emailPrefs`, `emailEvents` table for tracking, unsubscribe signed-token helper
3. **Foundational** — `lib/email/send.ts` (Resend wrapper), `lib/email/templates/` (Layout, Button, Header, Footer)
4. **Transactional first** — A1, A2, A3 (welcome, verify, password reset)
5. **Owner core** — B1, B2, B6, B9, B11
6. **Motivator core** — C1, C2, C4, C5
7. **Weekly digest** — B14 (the one that needs crons + a worker)
8. **Re-engagement** — F2, F3
9. **Phase 2** — the backlog above
