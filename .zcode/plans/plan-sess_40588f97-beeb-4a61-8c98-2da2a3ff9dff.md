# Link post OG previews (thumbnails + metadata)

## What happens now
When a user posts a link update, they type the URL and optionally a title. That's it — no image, no description, no site name. The link renders as plain text on the timeline and dashboard.

## What we're building
When a link is posted, the backend automatically:
1. Fetches the page HTML
2. Extracts OG metadata (`og:image`, `og:title`, `og:description`, `og:site_name`)
3. Downloads the OG image and stores it in Convex file storage (not hotlinked — survives source site changes)
4. Patches the update with the preview data
5. The timeline + dashboard render a rich link card with the image, title, and description

The user does nothing different — they paste a URL and the preview appears automatically within seconds.

## Step 1 — Schema (`convex/schema.ts`)
Add 3 fields to the updates table (after `linkTitle`):
- `linkImage: v.optional(v.id("_storage"))` — the downloaded OG image stored in Convex storage
- `linkDescription: v.optional(v.string())` — `og:description` or first paragraph
- `linkSiteName: v.optional(v.string())` — `og:site_name` (e.g. "YouTube", "GitHub")

## Step 2 — Backend: `convex/linkPreview.ts` (new file)
A `"use node"` internalAction `fetchPreview({ updateId })` that:
1. Loads the update via `ctx.runQuery` to get the `linkUrl`
2. `fetch`es the URL with a proper User-Agent header
3. Parses OG meta tags from the HTML using regex (no heavy parsing deps — OG tags are simple `<meta property="og:..." content="...">`)
4. If an `og:image` URL is found: downloads the image bytes and stores via `ctx.storage.store(blob)` → gets a `_storage` Id
5. Patches the update via `ctx.runMutation` with `{ linkImage, linkDescription, linkSiteName }`
6. If `linkTitle` is empty, fills it from `og:title` too
7. Graceful failure: if fetch fails or no OG tags, silently no-ops (the link still works as text)

Also: an `internalMutation` `applyPreview` that patches the update with the fetched data.

## Step 3 — Trigger (`convex/updates.ts`)
In the `add` mutation, after the insert + existing moderation scheduler call, add:
```ts
if (args.type === "link" && args.linkUrl) {
  await ctx.scheduler.runAfter(0, internal.linkPreview.fetchPreview, { updateId });
}
```
The `LinkForm` client needs zero changes.

## Step 4 — Render: rich link card

**`components/EditorialTimeline.tsx`** (`EntryBody`, link branch):
- If `linkImage` exists: render a clickable card with the OG image on top, title below, description truncated, site name + domain. Styled like a social media link preview (bordered card, rounded image, hover effect).
- If no image: keep the current text-only link display.
- The `linkImage` (storage Id) gets resolved via the existing `imageUrlOf` / `api.storage.getUrls` batch pattern already used for media images. Extend the `imageIds` set to include link images.

**`components/UpdateCard.tsx`** (dashboard):
- Same rich card treatment for the owner's own link updates.

**Shared `LinkPreviewCard` component** (`components/LinkPreviewCard.tsx`):
- A reusable card component that takes `{ url, title, description, siteName, imageUrl }` and renders the preview.
- Used by both EditorialTimeline and UpdateCard to avoid duplication.

## Step 5 — Backfill
A one-off action to fetch previews for existing link updates that don't have `linkImage` yet. Iterates over `type === "link"` updates where `linkImage` is undefined and calls `fetchPreview` for each.

## Files touched
**New:** `convex/linkPreview.ts`, `components/LinkPreviewCard.tsx`
**Edited:** `convex/schema.ts` (3 fields), `convex/updates.ts` (trigger), `components/EditorialTimeline.tsx` (render), `components/UpdateCard.tsx` (render)

## Edge cases handled
- Non-HTML responses (PDFs, images, APIs) → skip gracefully
- Slow/blocking URLs → 5-second fetch timeout, then give up
- URLs that redirect → follow redirects (fetch default)
- Missing OG tags → fall back to `<title>` + first `<p>` text
- Rate limiting from target sites → graceful failure, link still works as text
- Duplicate URLs → each update fetches independently (simpler, avoids a cache table)