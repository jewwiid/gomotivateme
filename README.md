# gomotivateme

A public motivation app, modeled on GoFundMe — but instead of raising money, you're raising motivation. Set a goal, share a single link, and let the people cheering you on drop reactions and notes as you work toward your target date.

> **Domain:** gomotivateme.com (beta)

## The core loop

1. Sign up (email + password).
2. Create a goal in a category (weight, fitness, learning, habit, creative, business, custom).
3. Set a start value, target value, unit, and a target date.
4. Upload a cover photo and write your "why this matters" story.
5. Get a public link like `gomotivateme.com/o/lose-20kg-by-summer-a1b2c`.
6. Share it. Anyone can visit.
7. Visitors see a GoFundMe-style public page with:
   - Cover hero with progress bar
   - Stats (now / target / days left)
   - Milestone badges (25 / 50 / 75 / 100%)
   - Organizer card
   - Long-form story
   - 4 reaction emojis (👍 💪 ❤️ 🔥) — one per visitor, toggle or switch
   - "Recent cheerers" feed
   - Vertical progress timeline
   - Sticky Share + Cheer buttons on mobile
8. Visitors can also leave a message (owner approves before it goes public).
9. The goal URL keeps working after completion — full journey remains visible with a celebration banner.

## Tech stack

- **Next.js 15** (App Router) hosted on **Vercel**.
- **Convex** for the database, real-time sync, file storage, and auth.
- **Convex Auth** (`@convex-dev/auth`) for email/password sign-in.
- **Tailwind CSS v4** for styling.
- **Framer Motion** for animations (progress bar, badge unlocks, emoji burst, completion banner).
- **TypeScript** end to end.
- **`next/og` ImageResponse** for dynamic per-goal Open Graph previews (1200×630).

## Repo layout

```
.
├── app/                         # Next.js App Router pages
│   ├── (auth)/                  # /login, /signup
│   ├── dashboard/               # /dashboard, /dashboard/new, /dashboard/[goalId]
│   ├── o/[slug]/                # /o/[slug] public page + dynamic opengraph-image
│   ├── layout.tsx               # Root layout with ConvexAuthNextjsServerProvider
│   └── page.tsx                 # Landing + live-goals discovery feed
├── components/                  # Reusable UI
│   ├── ReactionBar.tsx          # 4-emoji reaction bar (toggle / switch)
│   ├── RecentCheerers.tsx       # Recent emoji reactions feed
│   ├── OrganizerCard.tsx        # Owner profile card
│   ├── CompletionBanner.tsx     # 100% celebration
│   ├── StickyCta.tsx            # Fixed mobile Share + Cheer bar
│   ├── StorySection.tsx         # Long-form "why this matters" story
│   ├── ProgressBar.tsx          # Animated progress bar
│   ├── UpdateCard.tsx           # Progress entry card
│   ├── GoalCard.tsx             # Dashboard goal card
│   ├── Header.tsx               # Site header
│   └── ...                      # BadgeChip, CategoryIcon, MessageForm, MessageBubble
├── convex/                      # Convex schema + functions
│   ├── schema.ts                # users, goals, updates, reactions (emoji | message), badges
│   ├── auth.ts                  # Convex Auth setup
│   ├── goals.ts                 # Goal CRUD + denormalized owner profile
│   ├── updates.ts               # Notes / images / links / value updates
│   ├── reactions.ts             # 4-emoji reactions + messages (toggle / switch / approve)
│   ├── badges.ts                # Milestone badge read paths
│   ├── public.ts                # Public reads: by slug + recent public list
│   ├── storage.ts               # Convex file storage URL resolver
│   ├── users.ts                 # me() + batch organizer profile fetch
│   └── utils.ts                 # Slug gen, progress %, days-remaining, milestone logic
├── lib/                         # Shared client helpers
│   ├── ConvexClientProvider.tsx
│   ├── categories.ts            # Category list with default direction + icon
│   ├── format.ts                # Date / number / relative-time formatters
│   ├── useCurrentUser.ts        # Client-side current user hook
│   └── useVisitorKey.ts         # Anonymous per-visitor key (localStorage)
└── README.md
```

## Data model

- **goals** — owner, title, **story** (long-form), category, unit, start/target/current, direction, target date, slug (unique), `publicEnabled`, `coverImageId`, denormalized `ownerName`/`ownerImage`, `createdAt`
- **updates** — note / image / link / value entries on a goal
- **reactions** — `kind: "emoji" | "message"`; emojis store one of `thumbsup` / `muscle` / `heart` / `fire`; messages default to pending and require owner approval
- **badges** — milestone tiers (25 / 50 / 75 / 100) awarded by `goals.recordValue`

## Visitor behavior

- **Emoji reactions:** one per visitor per goal. Tap to set, tap the same emoji again to remove, tap a different emoji to switch. Counts of each emoji are shown next to the button.
- **Messages:** multiple allowed per visitor. Default to pending. Owner approves from the dashboard.
- **Anonymous by default:** visitors get a `localStorage`-backed `visitorKey` used for dedup. They can opt in to a display name when leaving a message.

## Local dev

```bash
# 1. Install
npm install

# 2. Set up Convex (creates project, generates types, writes .env.local)
npx convex dev

# 3. In a second terminal, start Next.js
npm run dev
```

Open http://localhost:3000. First sign-up is the workspace owner.

> **Why `convex dev` first?** The `convex/_generated/` TypeScript bindings are generated by Convex. The repo ships with stub bindings so the project typechecks before you set up a Convex project — running `npx convex dev` once replaces them with the real, schema-aware types.

## Deployment to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_CONVEX_URL` — the production Convex deployment URL (`npx convex deploy` prints it).
   - `CONVEX_URL` — same value; used by the dynamic OG image route (edge runtime) for server-side Convex queries.
   - `NEXT_PUBLIC_SITE_URL` — your Vercel deployment URL (e.g. `https://gomotivateme.com`).
4. Run `npx convex deploy` once locally to ship the schema and functions to the production deployment.
5. Deploy from Vercel.

## MVP scope (what's here)

- [x] Email + password sign-up / login
- [x] Goal creation with category, start, target, unit, deadline
- [x] **Long-form "why this matters" story** (multi-paragraph)
- [x] **Cover photo upload** + GoFundMe-style hero
- [x] Public share link per goal (auto-generated unique slug)
- [x] Progress updates: notes, images, links, value
- [x] **Vertical public timeline** with badges
- [x] **4-emoji reactions** (👍 💪 ❤️ 🔥) with toggle / switch behavior
- [x] **Recent cheerers feed** on the public page
- [x] **Organizer card** (name, photo, "X goals on gomotivateme")
- [x] **Goal completion celebration banner** at 100%
- [x] **Sticky mobile Share + Cheer CTA**
- [x] **Dynamic Open Graph image** per goal (1200×630) for share previews
- [x] **Live-goals discovery feed** on landing
- [x] Public thumbs-up + public message reactions
- [x] Owner approval flow for messages
- [x] Animated progress bar
- [x] Auto-awarded milestone badges (25 / 50 / 75 / 100%)
- [x] Owner-only inbox for messages (approve / hide / delete)
- [x] Image upload via Convex file storage
- [x] Per-visitor dedup for emoji reactions (localStorage key)

## Out of scope (post-launch)

- OAuth (Google / Apple)
- Email magic links
- Email notifications
- Following / activity feed
- Comments threading
- Push notifications
- Mobile (Expo)

## Notes for the developer

- The convex functions live next to the schema and use the `mutation` / `query` builders. The `_generated` folder is a stub before first `convex dev` run; real codegen replaces it.
- `getAuthUserId` from `@convex-dev/auth/server` is the server-side auth check; `useConvexAuth` from `convex/react` is the client-side auth state hook.
- The "support url" in the spec maps to `NEXT_PUBLIC_SITE_URL` — used to build the absolute share link shown in the dashboard and embedded in the OG image route.
- The OG image route (`app/o/[slug]/opengraph-image.tsx`) runs on the edge runtime and uses `ConvexHttpClient` to fetch the goal + cover URL. It renders a GoFundMe-style 1200×630 card with the title, cover photo, progress bar, and organizer name.
- Visitor emoji reactions are upserted by `reactions.setEmoji` (one per visitor per goal, with toggle + switch semantics).
