# Change Progress Type feature

## Problem
Goals are locked to their `progressType` at creation. A goal created as "number" (tracking users 8→100) can't switch to milestones later — the milestone UI is hidden, and there's no backend mutation to change the type or add milestones post-creation.

## Design decisions

**When to allow it:** Only when the goal has **no traction** — `supporterCount === 0 && currentValue === startValue` (no supporters, no logged progress). This matches the existing product philosophy in the codebase (lines 400-408 of goals.ts: "progressType mid-run would invalidate the commitment"). Once a goal has real activity, the type is locked. This keeps it clean — you can fix a miscreated goal, but can't pull the rug out from supporters.

**What happens on switch:** Server-side coercion mirrors the `create` mutation:
- → `milestones`: force `startValue=0`, `currentValue=0`, `targetValue=milestones.length`, `unit="milestones"`, `direction="increase"`, seed the `milestones` array with defaults
- → `streak`: force `startValue=0`, `currentValue=0`, `unit="days"`, `direction="increase"`, clear milestones
- → `number`: keep client-sent start/target/unit/direction, clear milestones

## Implementation

### Step 1 — Backend: new `changeProgressType` mutation (`convex/goals.ts`)

```
changeProgressType(goalId, progressType, startValue?, targetValue?, unit?, direction?, milestones?)
```

- Auth check (owner only)
- **Traction gate**: throw if `supporterCount > 0 || currentValue !== startValue`
- Server-side coercion per type (same logic as `create` lines 150-187)
- Patches the goal doc with new `progressType`, coerced values, and milestone array
- Returns the updated goal

### Step 2 — Backend: `addMilestone` + `removeMilestone` mutations (`convex/goals.ts`)

Allow milestone list editing after creation (currently impossible):
- `addMilestone(goalId, title)` — appends `{ id, title, done: false }` to the milestones array, increments `targetValue`
- `removeMilestone(goalId, milestoneId)` — removes from array (only if not `done`), decrements `targetValue`
- Both gated on `progressType === "milestones"`

### Step 3 — Frontend: progress type switcher in GoalSettings (`app/dashboard/[goalId]/page.tsx`)

Inside the existing `GoalSettings` component (lines 1245-1752), above the target-fields block:
- A "Progress type" section with the 3-option card picker (reusing `PROGRESS_TEMPLATES` pattern from the create form)
- **Gated behind the traction check** — if the goal has supporters or logged progress, show the lock banner ("This goal has activity — close it and start a new one to change the tracking method")
- When switching to milestones, show the milestone list editor (add/remove/edit titles) — same UI as the create form step 3
- When switching to number, show start/target/unit/direction fields
- When switching to streak, show the days target field
- "Save changes" button calls the new `changeProgressType` mutation

### Step 4 — Frontend: milestone add/remove in the dashboard

Update `MilestonesList` component to include an "Add milestone" button and per-milestone remove/edit affordances — calls the new `addMilestone`/`removeMilestone` mutations. This makes milestones editable from both the settings panel AND the main dashboard view.

## Files touched
**Edited:** `convex/goals.ts` (2-3 new mutations), `app/dashboard/[goalId]/page.tsx` (GoalSettings + milestone UI), `components/MilestonesList.tsx` (add/remove buttons)
**No new files, no schema changes** (milestones array already exists on the goal doc)

## Not in scope
- Converting existing progress history when switching types (old updates stay as-is — they're just notes at that point)
- Allowing type changes after traction (deliberately locked — would confuse supporters)