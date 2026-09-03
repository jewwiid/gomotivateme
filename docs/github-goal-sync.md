# GitHub goal sync

GitHub is connected in GoMotivateMe because GoMotivateMe owns goals. AIBL uses
the existing partner connection, so it never needs a second GitHub login.

## GitHub App setup

GitHub is connected with one platform-owned GitHub App, not a personal access
token or OAuth application. Each member installs the app from GoMotivateMe,
chooses the repositories they want to share, and can remove access in GitHub at
any time.

Create the App under the GoMotivateMe GitHub owner using these exact values:

| Field | Value |
| --- | --- |
| App name | `GoMotivateMe Goal Sync` (or another available public name) |
| Homepage URL | `https://www.gomotivate.me` |
| Setup URL | `https://compassionate-crab-352.eu-west-1.convex.site/github/app/setup` |
| User authorization callback URL | `https://compassionate-crab-352.eu-west-1.convex.site/github/app/authorize` |
| Webhook URL | `https://compassionate-crab-352.eu-west-1.convex.site/github/webhook` |
| Request user authorization during installation | Off |
| Installation target | Any account |

Enable webhooks and choose a long random webhook secret. Grant only these
repository permissions: **Contents: Read-only**, **Pull requests: Read-only**
(Metadata is read-only by default). Subscribe to **Installation**,
**Installation repositories**, **Push**, and **Pull request** events.

After creating the App, generate and download a private key. Store the values
only in the GoMotivateMe **Convex** environment:

```sh
npx convex env set GITHUB_APP_ID "<GitHub App ID>"
npx convex env set GITHUB_APP_SLUG "<GitHub App URL slug>"
npx convex env set GITHUB_APP_PRIVATE_KEY "<PKCS#8 private key>"
npx convex env set GITHUB_APP_WEBHOOK_SECRET "<same secret configured in GitHub>"
npx convex env set GITHUB_APP_CLIENT_ID "<GitHub App client ID>"
npx convex env set GITHUB_APP_CLIENT_SECRET "<GitHub App client secret>"
npx convex env set GITHUB_APP_AUTHORIZATION_CALLBACK_URL "https://compassionate-crab-352.eu-west-1.convex.site/github/app/authorize"
```

GitHub downloads an `RSA PRIVATE KEY` (PKCS#1). Convert it before setting the
environment value; keep the original download in a secure recovery location:

```sh
openssl pkcs8 -topk8 -nocrypt -in github-app.private-key.pem | npx convex env set GITHUB_APP_PRIVATE_KEY --force
```

The private key must never be committed, pasted into the client, or stored in
Vercel public variables. GitHub installation tokens are created server-side on
demand and are never persisted. Once the environment values are set, users use
**Settings → Integrations → Install GitHub App**; no GitHub credential is
entered in GoMotivateMe.

If the goal should become an AIBL campaign, use **Create campaign in AIBL**
from that goal. The dated GitHub history is created as completed AIBL tasks.

## Measurements and existing goals

- New career, launch, and creative goals can select **GitHub commits**. New
  career and launch goals can also select **Merged pull requests**. These are
  numeric, increasing measurements and can advance automatically.
- Any existing goal can link a repository in **activity-only** mode. It gets a
  dated history, sync state, and AI recap without changing its original metric.
- Automatic counting is intentionally blocked for incompatible measurements;
  commits must not silently inflate a revenue, weight, or milestone goal.

## Backfill and dates

Each link has a `backfillFrom` date. Commits use the Git commit date and pull
requests use the merged date. Events are deduplicated by commit SHA or pull
request number, so re-running a backfill is safe. AIBL receives one completed
daily task per linked GitHub activity day, preserving historical dates without
creating a task for every single commit.

Goal target dates remain subject to the existing goal policy: they must be in
the future. Backfill records historical progress; it does not rewrite a goal's
deadline into the past.

## Automation

Push and merged pull-request webhooks trigger an immediate import for linked
repositories. The hourly Convex job remains as a safe recovery path for a
missed webhook. Both routes update compatible goal measurements and sync daily
activity to an already linked AIBL campaign. AI recaps are user-triggered in
Settings so background sync does not create unexpected model cost; they use
only verified GitHub facts and fall back to a deterministic summary when AI is
unavailable.
