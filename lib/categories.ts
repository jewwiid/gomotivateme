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
  /** Category-aware placeholder for the title input. */
  titlePlaceholder?: string;
  /** Category-aware placeholder for the summary input. */
  summaryPlaceholder?: string;
  /** Category-aware prompt for the story textarea. */
  storyPrompt?: string;
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
    titlePlaceholder: "e.g. Lose 10kg and keep it off",
    summaryPlaceholder: "e.g. Getting back to a weight I feel good at",
    storyPrompt: "What's driving this? What have you tried before? What would support look like for you?",
  },
  {
    id: "learning",
    label: "Learning",
    icon: "graduation-cap",
    unitOptions: ["books", "pages", "courses", "hours", "lessons"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Quarter way", "Halfway", "Nearly there", "Complete"],
    titlePlaceholder: "e.g. Read 12 books this year",
    summaryPlaceholder: "e.g. One book a month, no excuses",
    storyPrompt: "Why does this matter to you? What do you want to do with what you learn?",
  },
  {
    id: "career",
    label: "Career & money",
    icon: "briefcase",
    unitOptions: ["$", "calls", "clients", "applications", "interviews"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Set goal", "First wins", "Build momentum", "Hit target"],
    titlePlaceholder: "e.g. Land a senior developer role",
    summaryPlaceholder: "e.g. 5 applications a week until I get an offer",
    storyPrompt: "Where are you now, and where do you want to be? What's been holding you back?",
  },
  {
    id: "launch",
    label: "Product launch",
    icon: "rocket",
    unitOptions: ["users", "signups", "downloads", "milestones"],
    defaultProgressType: "milestones",
    defaultDirection: "increase",
    defaultMilestones: ["Research", "Build MVP", "Beta test", "Launch", "Iterate"],
    titlePlaceholder: "e.g. Launch my app to 100 users",
    summaryPlaceholder: "e.g. From idea to first 100 signups",
    storyPrompt: "What are you building? What does success look like for the first version?",
  },
  {
    id: "creative",
    label: "Creative project",
    icon: "palette",
    unitOptions: ["pages", "songs", "episodes", "paintings", "chapters", "drafts"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Outline", "First draft", "Revise", "Finish", "Publish"],
    titlePlaceholder: "e.g. Write my first novel",
    summaryPlaceholder: "e.g. 300 pages, first draft done by summer",
    storyPrompt: "What's the story or project you've been carrying? What would help you finally ship it?",
  },
  {
    id: "habit",
    label: "Habit & streak",
    icon: "flame",
    unitOptions: ["days"],
    defaultProgressType: "streak",
    defaultDirection: "increase",
    defaultMilestones: ["7 days", "30 days", "60 days", "100 days"],
    titlePlaceholder: "e.g. Meditate every day for 30 days",
    summaryPlaceholder: "e.g. Building a daily meditation habit",
    storyPrompt: "What habit are you building? What's tripped you up before?",
  },
  {
    id: "sports",
    label: "Sports & event",
    icon: "dumbbell",
    unitOptions: ["km", "miles", "minutes", "reps", "matches", "races"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start training", "First milestone", "Peak", "Event day"],
    titlePlaceholder: "e.g. Run a half marathon",
    summaryPlaceholder: "e.g. From couch to 21km in 16 weeks",
    storyPrompt: "What's the event or target? What's your training situation right now?",
  },
  {
    id: "community",
    label: "Community & charity",
    icon: "heart-handshake",
    unitOptions: ["$", "people", "events", "volunteers"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Plan", "Launch", "Grow", "Goal reached"],
    titlePlaceholder: "e.g. Raise $5,000 for my local food bank",
    summaryPlaceholder: "e.g. 100 donors, $50 average",
    storyPrompt: "Who or what are you raising for? Why this cause?",
  },
  {
    id: "personal",
    label: "Personal milestone",
    icon: "target",
    unitOptions: ["milestones"],
    defaultProgressType: "milestones",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Halfway", "Nearly there", "Complete"],
    titlePlaceholder: "e.g. Plan my wedding",
    summaryPlaceholder: "e.g. Breaking a big life event into steps",
    storyPrompt: "What's the milestone? What makes it feel big right now?",
  },
  {
    id: "travel",
    label: "Travel & adventure",
    icon: "plane",
    unitOptions: ["places", "miles", "days", "countries"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Plan", "First stop", "Halfway", "Complete"],
    titlePlaceholder: "e.g. Visit 5 new countries",
    summaryPlaceholder: "e.g. One trip every two months",
    storyPrompt: "Where do you want to go? What's been keeping you from going?",
  },
  {
    id: "family",
    label: "Family & kids",
    icon: "users-round",
    unitOptions: ["days", "sessions", "activities", "outings"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Start", "Halfway", "Nearly there", "Complete"],
    titlePlaceholder: "e.g. 20 dedicated family days this year",
    summaryPlaceholder: "e.g. Quality time, planned and tracked",
    storyPrompt: "What do you want to build with your family? What does a good outing look like?",
  },
  {
    id: "faith",
    label: "Faith & spiritual",
    icon: "church",
    unitOptions: ["days", "sessions", "chapters", "practices"],
    defaultProgressType: "number",
    defaultDirection: "increase",
    defaultMilestones: ["Begin", "First milestone", "Deepen", "Complete"],
    titlePlaceholder: "e.g. Read through the Bible in a year",
    summaryPlaceholder: "e.g. A chapter a day, with reflection",
    storyPrompt: "What are you working toward in your faith? What would help you stay consistent?",
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
    titlePlaceholder: "e.g. Declutter my entire apartment",
    summaryPlaceholder: "e.g. Room by room over 3 months",
    storyPrompt: "What's the goal? What does done look like for you?",
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
