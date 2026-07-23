/**
 * Goal categories — shared between the create form, public pages, and
 * the explore feed.
 *
 * Activity-oriented (not cause-oriented like GoFundMe): each represents
 * a *type of thing you're working on*, with concrete unit suggestions and
 * a sensible default progress type. This covers the real use cases:
 * weight loss, reading, app launches, personal milestones, habits, etc.
 */

export type ProgressType = "number" | "streak" | "milestones";
export type Direction = "increase" | "decrease";

export interface Category {
  id: string;
  label: string;
  icon: string;
  /** Concrete unit options for the `<select>` — first is the default. */
  unitOptions: string[];
  /** Pre-select this progress type when the category is chosen. */
  defaultProgressType: ProgressType;
  defaultDirection: Direction;
  /** If true, the body-topic soft warning shows on the public page. */
  sensitive?: boolean;
  /** Category-aware default milestones (used when progressType === "milestones"). */
  defaultMilestones?: string[];
  /** Optional one-line description shown under the label in pickers. */
  hint?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "health",
    label: "Health & fitness",
    icon: "heart-pulse",
    unitOptions: ["kg", "lbs", "km", "miles", "reps", "workouts"],
    defaultProgressType: "number",
    defaultDirection: "decrease",
    sensitive: true,
    defaultMilestones: ["Set a baseline", "First milestone", "Halfway there", "Goal reached"],
  },
  {
    id: "learning",
    label: "Learning",
    icon: "graduation-cap",
    unitOptions: ["books", "pages", "courses", "hours", "lessons"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Quarter way", "Halfway", "Nearly there", "Complete"],
  },
  {
    id: "career",
    label: "Career & money",
    icon: "briefcase",
    unitOptions: ["$", "calls", "clients", "applications", "interviews"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Set goal", "First wins", "Build momentum", "Hit target"],
  },
  {
    id: "launch",
    label: "Product launch",
    icon: "rocket",
    unitOptions: ["users", "signups", "downloads", "milestones"],
    defaultProgressType: "milestones",
    defaultDirection: "increase",
    defaultMilestones: ["Research", "Build MVP", "Beta test", "Launch", "Iterate"],
  },
  {
    id: "creative",
    label: "Creative project",
    icon: "palette",
    unitOptions: ["pages", "songs", "episodes", "paintings", "chapters", "drafts"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Outline", "First draft", "Revise", "Finish", "Publish"],
  },
  {
    id: "habit",
    label: "Habit & streak",
    icon: "flame",
    unitOptions: ["days"],
    defaultProgressType: "streak",
    defaultDirection: "increase",
    defaultMilestones: ["7 days", "30 days", "60 days", "100 days"],
  },
  {
    id: "sports",
    label: "Sports & event",
    icon: "dumbbell",
    unitOptions: ["km", "miles", "minutes", "reps", "matches", "races"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start training", "First milestone", "Peak", "Event day"],
  },
  {
    id: "community",
    label: "Community & charity",
    icon: "heart-handshake",
    unitOptions: ["$", "people", "events", "volunteers"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Plan", "Launch", "Grow", "Goal reached"],
  },
  {
    id: "personal",
    label: "Personal milestone",
    icon: "target",
    unitOptions: ["milestones"],
    defaultProgressType: "milestones",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Halfway", "Nearly there", "Complete"],
  },
  {
    id: "travel",
    label: "Travel & adventure",
    icon: "plane",
    unitOptions: ["places", "miles", "days", "countries"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Plan", "First stop", "Halfway", "Complete"],
  },
  {
    id: "family",
    label: "Family & kids",
    icon: "users-round",
    unitOptions: ["days", "sessions", "activities", "outings"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Halfway", "Nearly there", "Complete"],
  },
  {
    id: "faith",
    label: "Faith & spiritual",
    icon: "church",
    unitOptions: ["days", "sessions", "chapters", "practices"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Begin", "First milestone", "Deepen", "Complete"],
  },
  {
    id: "other",
    label: "Other",
    icon: "circle-ellipsis",
    unitOptions: ["units", "items", "sessions", "tasks", "milestones"],
    defaultProgressType: "milestones",
    defaultDirection: "increase",
    hint: "Anything that doesn't fit the other categories",
    defaultMilestones: ["Start", "Halfway", "Nearly there", "Complete"],
  },
];

/**
 * Subset surfaced as featured filter pills on the home/explore page.
 * Picks the broadly appealing, positive categories.
 */
export const FEATURED_CATEGORIES = CATEGORIES.filter((c) =>
  ["health", "learning", "launch", "creative", "habit", "personal"].includes(c.id)
);

export type CategoryId = string;

export function getCategory(id: string): Category {
  const direct = CATEGORIES.find((c) => c.id === id);
  if (direct) return direct;

  // Unknown category → fall back to "Other" (no legacy mapping).
  return CATEGORIES.find((c) => c.id === "other")!;
}

/**
 * Category-aware default milestones. Falls back to the category's
 * defaultMilestones, then to a generic 4-step list.
 */
export function getDefaultMilestones(categoryId: string): Array<{ id: string; title: string }> {
  const cat = getCategory(categoryId);
  const titles = cat.defaultMilestones ?? ["Step 1", "Step 2", "Step 3", "Done"];
  return titles.map((title, i) => ({ id: `m${i + 1}`, title }));
}
