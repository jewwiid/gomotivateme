# Goal creation overhaul — categories, metrics, form flow

## Problem
The categories are GoFundMe cause-oriented (medical, memorial, emergency, charity…), not activity-oriented. A user who wants to "lose weight", "launch an app", or "read 50 pages" can't find a natural fit. The unit picker is brittle (`hint.split(" ")[0]` → "any"), milestone defaults are hardcoded regardless of category, the direction toggle is jargon, and `startValue`/`currentValue` are required even for milestone/streak goals (the NaN bug we already hit).

## Scope of this pass
**Everything needed to make the 4 example cases work cleanly**: app launch, reading, weight loss, personal milestones — plus backend hardening and schema fix. This is a focused overhaul, not a full AI-assist rewrite.

---

## Step 1 — New category set (`lib/categories.ts`)

Replace the 18 GoFundMe categories with 12 activity-oriented ones. Each gets `unitOptions` (actual array, not a hint string) and `defaultProgressType`:

| ID | Label | Units | Default type | Direction |
|----|-------|-------|-------------|-----------|
| `health` | Health & fitness | kg, lbs, km, miles, reps | number | decrease (weight) / increase (fitness) |
| `learning` | Learning | books, pages, courses, hours | number | increase |
| `career` | Career & money | $, calls, clients, applications | number | increase |
| `launch` | Product launch | — (milestones) | milestones | increase |
| `creative` | Creative project | songs, pages, episodes, paintings | number | increase |
| `habit` | Habit & streak | days | streak | increase |
| `sports` | Sports & fitness event | km, miles, minutes, reps | number | increase |
| `community` | Community & charity | $, people, events | number | increase |
| `personal` | Personal milestone | — (milestones or number) | milestones | increase |
| `travel` | Travel & adventure | places, miles, days | number | increase |
| `family` | Family & kids | any | number | increase |
| `faith` | Faith & spiritual | days, sessions | number | increase |

Each category object: `{ id, label, icon, unitOptions: string[], defaultProgressType, defaultDirection }`.

**Remove** the legacy `"weight"` category reference (the public page has `goal.category === "weight"` soft-warning logic — replace with a `health` + `unit in [kg, lbs]` check, or a `sensitiveCategory` flag on the category object).

**Backward compatibility**: existing goals have old categories (`medical`, `creative`, `business`, etc). Add a `legacyCategoryMap` that maps old → new (`medical` → `health`, `business` → `career`, `wishes` → `personal`, `education` → `learning`, etc). `getCategory()` falls back to the map so old goals still display correctly.

## Step 2 — Backend hardening (`convex/goals.ts` + `convex/schema.ts`)

**`convex/goals.ts`**:
- Update the duplicated `CATEGORIES` list to the new 12 ids
- In the `create` handler: server-side coercion based on `progressType`:
  - `milestones`: force `startValue = 0`, `currentValue = 0`, `targetValue = milestones.length`, `direction = "increase"`, `unit = "milestones"` — ignore client-sent values
  - `streak`: force `startValue = 0`, `unit = "days"`, `direction = "increase"`
  - `number`: keep client values but validate `targetValue !== startValue` and direction consistency

**`convex/schema.ts`** (lines 79-81):
- `startValue: v.optional(v.number())` (was required → caused NaN)
- `currentValue: v.optional(v.number())` (was required)
- This is backwards-compatible: existing rows keep their values; new milestone/streak goals can omit them

## Step 3 — Form improvements (`app/dashboard/new/page.tsx`)

**Category picker (step 1)**:
- Replace `onCategoryChange` to set `unit` from `category.unitOptions[0]` (not `hint.split(" ")[0]`)
- Set `progressType` from `category.defaultProgressType` automatically

**Progress type step (step 2)**:
- When category has `defaultProgressType`, pre-select it (user can still override)
- **Unit becomes a `<select>`** with `category.unitOptions` as options + "Custom…" free-text fallback (not a parsed hint string)

**Direction toggle (step 3)**:
- Remove the raw `↓ decrease / ↑ increase` toggle
- Replace with human language: for `health` show "Lose weight" vs "Build fitness" radio; for other categories default to increase and hide the toggle entirely (only show if the user explicitly switches to a number type and the category supports both directions)

**Milestone defaults**:
- Replace hardcoded Research/Plan/Execute/Complete with category-aware defaults:
  - `launch`: Research → Build MVP → Beta test → Launch
  - `personal`: Start → Halfway → Nearly there → Complete
  - `health` (if user picks milestones): Set baseline → First milestone → Second milestone → Goal
  - Default fallback: Step 1 → Step 2 → Step 3 → Done
- User can still edit all milestone titles inline

**Validation feedback**:
- Show inline error text when `canAdvance()` is false (currently the button just silently disables):
  - "Enter a title to continue"
  - "Target must be different from starting value"
  - "Pick a date in the future"

## Step 4 — Display fixes

**`app/o/[slug]/page.tsx`** (public goal page):
- Replace `goal.category === "weight"` with a `sensitiveCategories` check: `["health"].includes(goal.category) && ["kg", "lbs"].includes(goal.unit)` — keeps the body-topic soft warning for weight goals without a legacy `"weight"` id

**`components/GoalCard.tsx`**:
- Already uses `getCategory()` for display — the backward-compat map in Step 1 handles this automatically

## Step 5 — Backfill existing prod data

One-off mutation that:
- Maps old category ids → new ids on all existing goals
- Sets `startValue`/`currentValue` to `0` where they're `NaN` or `undefined`

## What this does NOT include (flagging)
- **AI title-to-suggestion** (typing "lose 10kg" auto-suggests health/kg/decrease) — valuable but a separate feature; the category picker with `unitOptions` already makes the manual flow much faster
- **Collapsing 9 steps → 5** — the improvements above make each step clearer and faster, but the step count stays the same to avoid a risky UX rewrite in this pass
- **Support types** (`encourage`, `checkin`, etc.) — untouched, they work fine

## Files touched
**Edited**: `lib/categories.ts`, `convex/goals.ts`, `convex/schema.ts`, `app/dashboard/new/page.tsx`, `app/o/[slug]/page.tsx`
**No new files**