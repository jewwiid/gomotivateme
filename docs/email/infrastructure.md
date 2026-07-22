# Email Infrastructure

> Technical setup for sending emails from gomotivateme.
> Stack: **Resend** for delivery, **React Email** for templates,
> **Convex crons** for scheduled sends.

## Service: Resend

Why Resend:
- React Email is built and maintained by the Resend team — first-class integration
- $20/mo for 50k emails, free tier 100/day, 3k/mo — fine for MVP
- Built-in open + click tracking
- Webhook support for bounces, complaints, unsubscribes
- TypeScript SDK, excellent DX

Alternatives considered:
- **Postmark** — also great, but separate React Email setup, more expensive at scale
- **SendGrid** — mature but DX is dated
- **AWS SES** — cheapest at scale but you build the template engine + tracking + bounce handling yourself

## Accounts & DNS

Add these records on `gomotivateme.com` (via the DNS provider — Cloudflare
in our case). Resend provides exact values in the dashboard after you verify
the domain.

### Sender domains to verify
- `gomotivateme.com` (root) — used as the DKIM-signing domain
- We'll send from subdomains:
  - `noreply@gomotivateme.com` — transactional
  - `hello@gomotivateme.com` — lifecycle / digest / re-engagement
  - `alerts@gomotivateme.com` — admin (G1–G4)

### Records to add
```
Type   Name    Value
─────  ──────  ──────────────────────────────────────
TXT    @       v=spf1 include:_spf.resend.com -all
TXT    resend._domainkey  (value from Resend dashboard)
TXT    _dmarc  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@gomotivateme.com
```

### Warmup plan
- **Week 1**: max 50 emails/day, all transactional only
- **Week 2**: max 200/day
- **Week 3**: max 1k/day, can start lifecycle
- **Week 4+**: full throttle

Resend auto-handles throttling. We just need to not blast.

## Env vars

### Vercel (prod)
```
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=whsec_xxx
EMAIL_FROM_TX=noreply@gomotivateme.com
EMAIL_FROM_LIFECYCLE=hello@gomotivateme.com
EMAIL_FROM_ALERTS=alerts@gomotivateme.com
EMAIL_REPLY_TO=hello@gomotivateme.com
NEXT_PUBLIC_SITE_URL=https://gomotivateme.com
```

### `.env.local` (dev)
```
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=whsec_xxx
EMAIL_FROM_TX=noreply@gomotivateme.com
EMAIL_FROM_LIFECYCLE=hello@gomotivateme.com
EMAIL_FROM_ALERTS=alerts@gomotivateme.com
EMAIL_REPLY_TO=hello@gomotivateme.com
NEXT_PUBLIC_SITE_URL=http://localhost:3030
```

> ⚠️ Use Resend's **test mode** API key in dev — sends only to addresses you've
> verified on the Resend dashboard, so you can't accidentally spam real users.

## Dependencies

```
npm i resend @react-email/components
```

`@react-email/components` gives us `<Html>`, `<Head>`, `<Body>`, `<Container>`,
`<Section>`, `<Text>`, `<Heading>`, `<Button>`, `<Link>`, `<Img>`, `<Hr>`,
`<Preview>`, `<Tailwind>` (works with Tailwind classes inside JSX).

## File layout

```
lib/
  email/
    send.ts                  # Resend wrapper, error handling, event recording
    render.ts                # React Email → HTML + plain text
    types.ts                 # EmailType, EmailPrefs, EmailContext types
    unsubscribe.ts           # Signed-token encode/decode
    layout/
      BaseLayout.tsx         # HTML shell, header, footer
      BrandHeader.tsx        # Logo
      BrandFooter.tsx        # Unsubscribe + address
    templates/
      welcome.tsx            # A1
      verify-email.tsx       # A2
      password-reset.tsx     # A3
      new-motivator-application.tsx  # B1
      new-support-message.tsx        # B6
      goal-launched.tsx              # B9
      goal-hit-target.tsx            # B11
      weekly-digest.tsx              # B14
      check-in-due.tsx               # C5
      // ... 40+ more
convex/
  email/
    send.ts                  # internalAction: send a single email
    queue.ts                 # internalMutation: write to emailQueue table
    crons.ts                 # crons definitions (digests, re-engagement, etc.)
    events.ts                # Resend webhook handler (public action)
    prefs.ts                 # user.emailPrefs mutations
```

## The `send` wrapper

`lib/email/send.ts` is the ONLY place that calls `resend.emails.send`.
Every email goes through it. It:

1. Renders the React Email template to HTML + plain text
2. Looks up `user.emailPrefs` — checks the right opt-out flag for the email type
3. If opted out, writes a `SKIPPED_OPTED_OUT` row to `emailEvents` and returns
4. Looks up the user's stored `unsubscribeToken` and appends the unsub link to the footer
5. Calls `resend.emails.send`
6. Writes the resulting `emailId` to `emailEvents` for tracking
7. Catches and logs errors (does NOT throw — emails should never break product flow)

```ts
// lib/email/send.ts (sketch)
import { Resend } from "resend";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(args: {
  to: string;
  type: EmailType;
  // ...template props
}): Promise<{ emailId: string | null; skipped: "opted_out" | null }> {
  // 1. check prefs (if applicable)
  const prefs = await ctx.runQuery(internal.email.prefs.get, { userId });
  if (shouldSkip(prefs, args.type)) {
    return { emailId: null, skipped: "opted_out" };
  }

  // 2. render
  const Component = TEMPLATE_REGISTRY[args.type];
  const html = await render(<Component {...args} />);
  const text = await render(<Component {...args} />, { plainText: true });

  // 3. add unsub link footer (template-internal)
  const finalHtml = appendUnsubscribeLink(html, prefs.unsubscribeToken);

  // 4. send
  const { data, error } = await resend.emails.send({
    from: getFromForType(args.type),
    to: args.to,
    subject: ...,
    html: finalHtml,
    text,
    replyTo: process.env.EMAIL_REPLY_TO,
  });

  if (error) {
    console.error("[email] send failed", { type: args.type, error });
    return { emailId: null, skipped: null };
  }
  return { emailId: data!.id, skipped: null };
}
```

## Bounce / complaint webhooks

Resend POSTs to `https://<your-site>/api/email/webhook` on:
- `email.delivered` — log to `emailEvents`
- `email.bounced` (hard) — flag user as `emailBounced: true`, skip all future emails
- `email.complained` (spam report) — auto-unsubscribe that user from `marketing` prefs
- `email.opened` — log to `emailEvents` (optional, for digest analytics)
- `email.clicked` — log to `emailEvents`

The handler verifies the `Resend-Signature` header against
`RESEND_WEBHOOK_SECRET` to prevent spoofing.

## Unsubscribe flow

Every email footer has: `Don't want these? Unsubscribe → {signedUrl}`

The signed URL is `/api/email/unsubscribe?token=...&type=digest` (or `marketing`).
The handler:
1. Decodes the token → `{ userId, exp }`
2. Patches `user.emailPrefs[type] = false`
3. Returns a 200 with a friendly HTML page

Tokens are signed with `RESEND_WEBHOOK_SECRET` (or a dedicated `UNSUBSCRIBE_SECRET`)
using `jose` or `iron-session`. 30-day expiry.

## Deliverability monitoring

Track weekly in `emailEvents`:
- Bounce rate (target: < 2%)
- Complaint rate (target: < 0.1%)
- Open rate (target: > 25% for transactional, > 15% for lifecycle)
- Click rate (target: > 3% for transactional, > 2% for lifecycle)

Resend's dashboard shows all of this. No need to build custom.
