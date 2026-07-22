# Email — gomotivateme

Everything about how gomotivateme sends email.

## Read in this order

1. **[notifications-plan.md](./notifications-plan.md)** — the full inventory
   (~50 email types), MVP cut, design for the top 8, and the build order.
   Start here if you're new.
2. **[infrastructure.md](./infrastructure.md)** — Resend + React Email setup,
   DNS records, env vars, the `send` wrapper, bounce/complaint webhooks,
   unsubscribe flow, deliverability monitoring.
3. **[schema.md](./schema.md)** — the Convex tables (`userEmailPrefs`,
   `emailEvents`, optional `emailQueue`) and the supporting functions to add.
4. **[cron-patterns.md](./cron-patterns.md)** — how to wire scheduled emails
   (digests, re-engagement, inactivity nudges, check-in reminders) via
   Convex crons. Includes the scan → batch → send pattern and idempotency
   rules.

## Status

🟡 **Planning.** No code yet. Ready to start after we have:
- [ ] Resend account provisioned + `RESEND_API_KEY` in env
- [ ] `gomotivateme.com` DNS records (SPF / DKIM / DMARC) added
- [ ] Decision on email verification (required vs optional) — see plan §6

## Quick reference

- **From addresses:**
  - `noreply@gomotivateme.com` — transactional
  - `hello@gomotivateme.com` — lifecycle / digest
  - `alerts@gomotivateme.com` — admin
- **Reply-to:** `hello@gomotivateme.com` for everything
- **Stack:** Resend + React Email + Convex crons
- **Templates:** `lib/email/templates/*.tsx` (React Email components)
- **Sender:** `lib/email/send.ts` is the only place that calls Resend
- **Tracking:** `emailEvents` table, Resend webhooks → `/api/email/webhook`
