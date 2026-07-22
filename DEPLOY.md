# Deploying gomotivateme

Two parts: **Convex** (database + auth + file storage) and **Vercel** (the web app). Do Convex first, then Vercel.

---

## 0. `@convex-dev/auth` — generate and set the JWT keys

`@convex-dev/auth` signs session tokens with an RS256 keypair. You have to set `JWT_PRIVATE_KEY` and `JWKS` on the Convex deployment before any signIn/signUp will work — without them every auth call throws `Missing environment variable JWT_PRIVATE_KEY`, which the client surfaces as the opaque `The string did not match the expected pattern`.

The CLI does this for you:

```bash
npx @convex-dev/auth --prod        # interactive — confirms overwrite
```

If you want to do it manually (or to seed a fresh project that doesn't have the CLI's prompts available), generate the keys with `jose`:

```bash
node -e "
const jose = require('jose');
const fs = require('fs');
(async () => {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
  const priv = (await jose.exportPKCS8(privateKey)).trimEnd().replace(/\n/g, ' ');
  fs.writeFileSync('/tmp/jwt_priv.txt', priv);
  const jwks = JSON.stringify({ keys: [{ use: 'sig', ...await jose.exportJWK(publicKey) }] });
  fs.writeFileSync('/tmp/jwks.json', jwks);
})();
"
cat /tmp/jwt_priv.txt | npx convex env set JWT_PRIVATE_KEY
cat /tmp/jwks.json   | npx convex env set JWKS
```

Repeat for the prod deployment (append `--prod` or use `npx convex env set --prod`).

**Note:** `npx convex env set NAME "value"` breaks if the value starts with `--` (PEM keys do). Pipe via stdin (`cat file | npx convex env set NAME`) or use `--from-file`.

---

## 1. Set up Convex

```bash
cd "/Users/judeokun/Documents/GitHub/mie odyssey"
npx convex dev
```

- Opens browser to https://dashboard.convex.dev
- Sign in (Google / GitHub / email)
- Pick **Create a new project** → name it `gomotivateme`
- Convex creates a dev deployment and writes `NEXT_PUBLIC_CONVEX_URL` + `CONVEX_DEPLOY_KEY` to `.env.local`
- It then **deploys the schema and functions** to the dev deployment
- Replaces `convex/_generated/` with real, schema-aware TypeScript bindings
- Stays running in this terminal — leave it open. It hot-reloads on file changes.

In a second terminal, start the web app:

```bash
npm run dev
```

Visit http://localhost:3000. Sign up. Create a goal. Drop a reaction. **It all works end-to-end now.**

---

## 2. Push to GitHub

```bash
git remote add origin git@github.com:jewwiid/gomotivateme.git
git branch -M main
git push -u origin main
```

(Use whatever GitHub org/repo name you want — `jewwiid/gomotivateme` is a reasonable default. Use HTTPS if you don't have SSH keys set up.)

---

## 3. Set up Vercel

1. Go to https://vercel.com/new
2. **Import** the `gomotivateme` repo you just pushed
3. Framework: **Next.js** (auto-detected)
4. **Environment variables** — add these BEFORE the first deploy:
   - `NEXT_PUBLIC_CONVEX_URL` — the prod URL (we'll get this in the next step)
   - `CONVEX_URL` — same value as above
   - `NEXT_PUBLIC_SITE_URL` — `https://gomotivateme.com` (or your preview domain for now)
5. Click **Deploy** — first build will fail because the prod Convex URL isn't live yet. That's fine.

---

## 4. Deploy the production Convex

```bash
cd "/Users/judeokun/Documents/GitHub/mie odyssey"
npx convex deploy
```

- Uses the prod credentials stored in your Convex account
- Prints the production deployment URL — e.g. `https://wise-otter-123.convex.cloud`
- Deploys the schema and all functions

Copy that URL. Go to Vercel → Project Settings → Environment Variables. Set:

- `NEXT_PUBLIC_CONVEX_URL` = the prod URL
- `CONVEX_URL` = the same prod URL
- `NEXT_PUBLIC_SITE_URL` = `https://gomotivateme.com` (or your actual domain)

Then **redeploy** from the Vercel dashboard (Deployments tab → top deployment → ⋯ → Redeploy).

---

## 5. Point gomotivateme.com at Vercel

In your domain registrar (Namecheap / Cloudflare / etc.):

| Type | Name | Value |
| --- | --- | --- |
| `CNAME` | `@` | `cname.vercel-dns.com` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

(or use Vercel's "Add Domain" flow — it shows you the exact records.)

Then in Vercel → Project → Domains → add `gomotivateme.com` and `www.gomotivateme.com`. SSL is auto-provisioned.

---

## Environment variables reference

| Name | Where set | Where used |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex dev/prod URL | App, dashboard, public page, OG image |
| `CONVEX_URL` | Same as above | Edge OG image route (server-side) |
| `CONVEX_DEPLOY_KEY` | Set by `npx convex dev` | Convex CLI only — never commit |
| `NEXT_PUBLIC_SITE_URL` | Your domain | Absolute share links, OG metadata |
| `RESEND_API_KEY` | Convex env (`npx convex env set`) | Email drain action |
| `RESEND_FROM_ADDRESS` | Convex env | Email "from" header |
| `OPENAI_API_KEY` | Convex env (`npx convex env set`) | Automated text/image moderation |

> **Email is wired but dormant.** Until `RESEND_API_KEY` is set, the drain
> cron runs every 2 min and no-ops — notifications stay `pending` in the
> queue. The moment the key lands, queued emails send with zero code changes.

> **Moderation is fail-closed.** Until `OPENAI_API_KEY` is set on Convex,
> new goals, updates, and support messages remain in the manual review queue
> instead of being published publicly.

### Email DNS (when you're ready to send)

On your DNS provider for `gomotivateme.com`, add these records so Resend can
send on your behalf and email reaches inboxes (not spam):

1. **SPF** — `TXT @ v=spf1 include:amazonses.com ~all`
2. **DKIM** — Resend gives you 3 CNAME records in the dashboard → add as-is.
3. **DMARC** — `TXT _dmarc v=DMARC1; p=quarantine; rua=mailto:hello@gomotivateme.com`
4. Verify the sending domain (`gomotivateme.com`) in Resend → Domains.

---

## Pre-flight checklist

Before announcing, sanity check:

- [ ] `npm run build` passes locally
- [ ] `npx tsc --noEmit` passes
- [ ] `npx convex dev` shows no errors in the terminal
- [ ] Sign up + create goal + drop reaction + see cheer end-to-end
- [ ] Mobile: open `/o/<your-slug>` on your phone, share via WhatsApp, verify OG image preview
- [ ] Public page shows cover image, dual progress, recent supporters, editorial timeline
- [ ] Dashboard: pause / resume / complete all work

---

## Local dev quick reference

```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev
```

Both run together. Convex hot-reloads on schema/function changes; Next.js hot-reloads on page/component changes.

To switch the local app to point at a different Convex deployment (e.g. prod for testing), edit `.env.local` and restart `npm run dev`.
