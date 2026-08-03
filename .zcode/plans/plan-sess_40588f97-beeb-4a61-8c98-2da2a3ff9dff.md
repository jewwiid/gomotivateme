# Followers + private goals (approval-gated)

## Product model
- **Follow requires approval.** User A requests to follow User B. User B sees the request and accepts/declines. Only accepted followers can see private goals.
- **Private goals are invisible to non-followers.** Not in discovery, not searchable, not in profile activity. Only accepted followers + the owner can see them.
- Every user has a `followPolicy`: `"open"` (auto-accept) or `"approval"` (default). This is set in settings.

## Step 1 — Schema (`convex/schema.ts`)

### New table: `follows`
```
followeeId: v.id("users")   — the person being followed
followerId: v.id("users")   — the person requesting to follow
status: v.union(
  v.literal("pending"),     — awaiting approval
  v.literal("accepted"),    — approved follower
  v.literal("declined"),    — request was declined
  v.literal("removed")      — follower was removed by followee
)
createdAt: v.number()
acceptedAt: v.optional(v.number())
```
Indexes: `by_followee_status` (for "who wants to follow me"), `by_follower_status` (for "who do I follow"), `by_follower_followee` (for dedup / "am I following").

### Schema changes
- `goals.visibility`: add `v.literal("private")` to the union
- `users.followPolicy`: add `v.optional(v.union(v.literal("open"), v.literal("approval")))` — defaults to `"approval"`

All existing `visibility === "public"` filters automatically exclude private goals. No changes needed to existing public queries.

## Step 2 — `convex/follows.ts` (new module)

Mirrors the Motivation Circle approval pattern:

- **`request`** (mutation) — follow someone. Checks: not already following, not self. If target's `followPolicy === "open"`, insert with `status: "accepted"` immediately. If `"approval"`, insert with `status: "pending"` and notify the target.
- **`approve`** (mutation) — followee-only. Patches `status: "accepted"`, sets `acceptedAt`.
- **`decline`** (mutation) — followee-only. Patches `status: "declined"`.
- **`remove`** (mutation) — followee removes a follower. Patches `status: "removed"`.
- **`cancelRequest`** (mutation) — follower cancels their own pending request.
- **`listFollowers`** (query) — accepted followers of the current user (for the profile sidebar / follower count).
- **`listFollowing`** (query) — people the current user follows (for the profile sidebar / following count).
- **`listPendingRequests`** (query) — pending follow requests for the current user.
- **`amIFollowing`** (query) — given a userId, returns the follow status from the current user's perspective (`"accepted"` | `"pending"` | `"declined"` | `null`). Used by the profile Follow button.
- **`isApprovedFollower`** (internal query) — given a viewerId + ownerId, returns boolean. Used by private goal queries.

## Step 3 — Private goal access queries (`convex/public.ts`)

New queries that are **identity-aware** (call `getAuthUserId`):

- **`getPrivateGoal`** — like `getGoalBySlug` but for private goals. Checks: viewer is signed in AND has an accepted follow relationship with the owner. Returns the goal or null.
- **`listVisibleForUser`** — returns goals visible to the current user: their own goals + public goals + private goals from people they follow. Powers the dashboard's "from people you follow" feed (future).
- **`profileGoalsForViewer`** — returns goals from a profile that the viewer is allowed to see: public goals always, private goals only if viewer is an accepted follower. Used by the profile page.

The existing anonymous public queries (`listRecentPublic`, `searchPublicGoals`, etc.) stay unchanged — they already filter `visibility === "public"`, which excludes private goals.

## Step 4 — Profile page UI (`app/u/[handle]/page.tsx`)

- **Follow button** — in the header strip next to Share, shown when viewing someone else's profile. States:
  - Not following → "Follow" button
  - Request pending → "Requested" (disabled, click to cancel)
  - Accepted → "Following" (click to unfollow)
- **Follower/following counts** — added to the stats row
- **Private goals in activity tab** — uses `profileGoalsForViewer` instead of the current query. If the viewer isn't an approved follower, private goals simply don't appear.

## Step 5 — Goal creation form (`app/dashboard/new/page.tsx`)

Add a third visibility option:
- **Private** (Lock icon): "Only your approved followers can see this goal. Not in discovery or search."

## Step 6 — Follow requests in-app

The follow request creates a notification row (via the existing `internal.emails.enqueue` pipeline with a new `followRequest` template). This also surfaces in the notification bell (which we're about to build). The followee sees "X wants to follow you" and can approve/decline from the notification or their profile.

## Step 7 — Settings page

Add a "Follow policy" toggle in the settings page:
- "Approve followers" (default) — new followers need your approval
- "Open" — anyone can follow you instantly

## Files touched
**New:** `convex/follows.ts`
**Edited:** `convex/schema.ts` (follows table + visibility + followPolicy), `convex/public.ts` (identity-aware private queries), `convex/users.ts` (follower counts in profileSummary), `app/u/[handle]/page.tsx` (follow button + counts), `app/dashboard/new/page.tsx` (private visibility option), `app/settings/page.tsx` (follow policy toggle)

## Not in scope (flagging)
- **DMs / messaging** — followers can comment on goals but can't message each other directly
- **Follower-only feed** — a personalized "from people you follow" feed is a future enhancement; this pass just enables the privacy model + follow graph
- **Follower notifications bell** — building separately in the in-app notifications work