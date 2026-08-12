export type MeasurementProgressType = "number" | "streak" | "milestones";
export type MeasurementDirection = "increase" | "decrease";
export type MeasurementIcon =
  | "count"
  | "distance"
  | "duration"
  | "money"
  | "plan"
  | "streak"
  | "strength"
  | "people"
  | "weight";

export const MEASUREMENT_VERSION = 1;

export interface GoalMeasurementMetric {
  id: string;
  categoryId: string;
  label: string;
  description: string;
  progressType: MeasurementProgressType;
  icon: MeasurementIcon;
  units: string[];
  defaultUnit: string;
  directions: MeasurementDirection[];
  defaultDirection: MeasurementDirection;
  defaultStartValue?: number;
  suggestedTargetValue?: number;
  startLabel?: string;
  targetLabel?: string;
  milestones?: string[];
  allowsCustomUnit?: boolean;
}

const metric = (
  categoryId: string,
  value: Omit<GoalMeasurementMetric, "categoryId">
): GoalMeasurementMetric => ({ categoryId, ...value });

const CATALOG: Record<string, GoalMeasurementMetric[]> = {
  health: [
    metric("health", { id: "health.body-weight", label: "Body weight", description: "Move toward a specific healthy weight.", progressType: "number", icon: "weight", units: ["kg", "lbs"], defaultUnit: "kg", directions: ["decrease", "increase"], defaultDirection: "decrease", startLabel: "Current weight", targetLabel: "Target weight" }),
    metric("health", { id: "health.distance", label: "Distance covered", description: "Accumulate walking, running, cycling, or swimming distance.", progressType: "number", icon: "distance", units: ["km", "miles"], defaultUnit: "km", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 100, targetLabel: "Distance target" }),
    metric("health", { id: "health.workouts", label: "Workouts completed", description: "Count completed training or movement sessions.", progressType: "number", icon: "strength", units: ["workouts", "sessions"], defaultUnit: "workouts", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 24 }),
    metric("health", { id: "health.daily-habit", label: "Daily health habit", description: "Keep a daily movement, sleep, or wellbeing streak.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("health", { id: "health.plan", label: "Health plan", description: "Complete a sequence such as assessment, routine, and review.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Set a baseline", "Choose a routine", "Complete the first phase", "Review progress", "Reach the goal"] }),
  ],
  learning: [
    metric("learning", { id: "learning.material", label: "Material completed", description: "Count books, pages, chapters, lessons, or courses.", progressType: "number", icon: "count", units: ["books", "pages", "chapters", "lessons", "courses"], defaultUnit: "books", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 12 }),
    metric("learning", { id: "learning.study-time", label: "Study time", description: "Build a target amount of focused learning time.", progressType: "number", icon: "duration", units: ["hours", "minutes"], defaultUnit: "hours", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 40 }),
    metric("learning", { id: "learning.study-streak", label: "Daily study streak", description: "Study or practise every day.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("learning", { id: "learning.path", label: "Learning pathway", description: "Move through a syllabus, qualification, or self-made plan.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Define the outcome", "Complete the fundamentals", "Practise with a project", "Get feedback", "Finish or certify"] }),
  ],
  career: [
    metric("career", { id: "career.search-activity", label: "Job-search activity", description: "Track applications, interviews, calls, or conversations.", progressType: "number", icon: "count", units: ["applications", "interviews", "calls", "conversations"], defaultUnit: "applications", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 25 }),
    metric("career", { id: "career.clients", label: "Clients or opportunities", description: "Count clients, proposals, leads, or contracts won.", progressType: "number", icon: "people", units: ["clients", "proposals", "leads", "contracts"], defaultUnit: "clients", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 5 }),
    metric("career", { id: "career.savings", label: "Savings target", description: "Build a personal savings or income target.", progressType: "number", icon: "money", units: ["€", "$", "£"], defaultUnit: "€", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 1000 }),
    metric("career", { id: "career.practice-streak", label: "Daily career practice", description: "Keep a daily application, outreach, or skill-building streak.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("career", { id: "career.plan", label: "Career plan", description: "Complete the steps toward a role, promotion, or business outcome.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Define the outcome", "Prepare the essentials", "Start outreach", "Complete interviews or reviews", "Secure the outcome"] }),
  ],
  launch: [
    metric("launch", { id: "launch.plan", label: "Launch plan", description: "Move from research through build, release, and learning.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Research the problem", "Build the first version", "Test with real people", "Launch publicly", "Review and iterate"] }),
    metric("launch", { id: "launch.audience", label: "Audience reached", description: "Target users, signups, downloads, or subscribers.", progressType: "number", icon: "people", units: ["users", "signups", "downloads", "subscribers"], defaultUnit: "users", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 100 }),
    metric("launch", { id: "launch.usage", label: "Usage or sales", description: "Count trials, orders, sales, or active teams.", progressType: "number", icon: "count", units: ["trials", "orders", "sales", "teams"], defaultUnit: "trials", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 25 }),
    metric("launch", { id: "launch.revenue", label: "Revenue target", description: "Track revenue generated by the product or launch.", progressType: "number", icon: "money", units: ["€", "$", "£"], defaultUnit: "€", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 1000 }),
  ],
  creative: [
    metric("creative", { id: "creative.output", label: "Creative output", description: "Count words, pages, chapters, songs, episodes, or finished pieces.", progressType: "number", icon: "count", units: ["words", "pages", "chapters", "songs", "episodes", "pieces"], defaultUnit: "pages", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 100 }),
    metric("creative", { id: "creative.time", label: "Time creating", description: "Accumulate focused sessions or hours on the work.", progressType: "number", icon: "duration", units: ["hours", "sessions"], defaultUnit: "hours", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 40 }),
    metric("creative", { id: "creative.streak", label: "Daily creative streak", description: "Write, draw, compose, or make something every day.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("creative", { id: "creative.plan", label: "Project stages", description: "Move through outline, draft, revision, finish, and release.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Shape the idea", "Complete the first draft", "Revise the work", "Finish the final version", "Publish or share"] }),
  ],
  habit: [
    metric("habit", { id: "habit.daily", label: "Daily streak", description: "Do the habit every day and protect the chain.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("habit", { id: "habit.sessions", label: "Times completed", description: "Count each time you complete the habit without requiring daily frequency.", progressType: "number", icon: "count", units: ["sessions", "times", "days"], defaultUnit: "sessions", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("habit", { id: "habit.duration", label: "Time invested", description: "Accumulate minutes or hours spent on the habit.", progressType: "number", icon: "duration", units: ["minutes", "hours"], defaultUnit: "minutes", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 300 }),
    metric("habit", { id: "habit.stages", label: "Habit-building stages", description: "Use checkpoints instead of a daily or numeric target.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Choose the cue", "Complete the first week", "Remove a common obstacle", "Reach one month", "Review and continue"] }),
  ],
  sports: [
    metric("sports", { id: "sports.distance", label: "Distance", description: "Build toward a running, cycling, swimming, or walking distance.", progressType: "number", icon: "distance", units: ["km", "miles"], defaultUnit: "km", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 100 }),
    metric("sports", { id: "sports.finish-time", label: "Finish time", description: "Work down toward a faster event or performance time.", progressType: "number", icon: "duration", units: ["seconds", "minutes", "hours"], defaultUnit: "minutes", directions: ["decrease"], defaultDirection: "decrease", startLabel: "Current time", targetLabel: "Target time" }),
    metric("sports", { id: "sports.training", label: "Training completed", description: "Count training sessions, workouts, matches, or races.", progressType: "number", icon: "strength", units: ["sessions", "workouts", "matches", "races"], defaultUnit: "sessions", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 24 }),
    metric("sports", { id: "sports.performance", label: "Strength or performance", description: "Increase reps, weight lifted, or another performance measure.", progressType: "number", icon: "strength", units: ["reps", "kg", "lbs", "points"], defaultUnit: "reps", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0 }),
    metric("sports", { id: "sports.streak", label: "Daily training streak", description: "Complete the agreed minimum every day.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("sports", { id: "sports.plan", label: "Event or training plan", description: "Track preparation stages through event day.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Set the baseline", "Build the base", "Complete the peak phase", "Taper and prepare", "Event day"] }),
  ],
  community: [
    metric("community", { id: "community.people", label: "People involved", description: "Grow volunteers, members, participants, or people reached.", progressType: "number", icon: "people", units: ["volunteers", "members", "participants", "people"], defaultUnit: "volunteers", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 20 }),
    metric("community", { id: "community.events", label: "Events delivered", description: "Count events, sessions, workshops, or meetups completed.", progressType: "number", icon: "count", units: ["events", "sessions", "workshops", "meetups"], defaultUnit: "events", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 5 }),
    metric("community", { id: "community.service", label: "Service delivered", description: "Track volunteer hours or useful items collected and distributed.", progressType: "number", icon: "duration", units: ["hours", "items", "meals", "packages"], defaultUnit: "hours", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 100 }),
    metric("community", { id: "community.plan", label: "Community project plan", description: "Move from organising through delivery and review.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Understand the need", "Gather the team", "Prepare the project", "Deliver it", "Review the impact"] }),
  ],
  personal: [
    metric("personal", { id: "personal.plan", label: "Personal milestone plan", description: "Break a life goal into concrete, named stages.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Define what done means", "Make the first commitment", "Complete the main preparation", "Handle the final details", "Reach the milestone"] }),
    metric("personal", { id: "personal.tasks", label: "Tasks completed", description: "Count practical tasks or items finished.", progressType: "number", icon: "count", units: ["tasks", "items", "sessions"], defaultUnit: "tasks", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 20 }),
    metric("personal", { id: "personal.streak", label: "Daily personal practice", description: "Keep a daily action connected to the personal goal.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
  ],
  travel: [
    metric("travel", { id: "travel.places", label: "Places visited", description: "Count countries, cities, places, or trips completed.", progressType: "number", icon: "distance", units: ["countries", "cities", "places", "trips"], defaultUnit: "places", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 5 }),
    metric("travel", { id: "travel.distance", label: "Distance travelled", description: "Accumulate distance across an adventure or route.", progressType: "number", icon: "distance", units: ["km", "miles"], defaultUnit: "km", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 500 }),
    metric("travel", { id: "travel.days", label: "Days away", description: "Build toward a target number of travel or adventure days.", progressType: "number", icon: "duration", units: ["days", "nights"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 14 }),
    metric("travel", { id: "travel.plan", label: "Trip or adventure plan", description: "Track planning, preparation, travel, and completion.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Choose the destination", "Set the plan and budget", "Book or prepare", "Begin the trip", "Complete the adventure"] }),
  ],
  family: [
    metric("family", { id: "family.activities", label: "Time together", description: "Count activities, outings, sessions, or dedicated family days.", progressType: "number", icon: "people", units: ["activities", "outings", "sessions", "days"], defaultUnit: "activities", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 20 }),
    metric("family", { id: "family.hours", label: "Dedicated hours", description: "Accumulate protected time together.", progressType: "number", icon: "duration", units: ["hours"], defaultUnit: "hours", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 40 }),
    metric("family", { id: "family.streak", label: "Daily connection streak", description: "Complete one meaningful family action every day.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("family", { id: "family.plan", label: "Family project plan", description: "Complete the stages of a shared family goal.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Agree on the goal", "Make the plan", "Complete the first step", "Finish the main work", "Celebrate together"] }),
  ],
  faith: [
    metric("faith", { id: "faith.reading", label: "Reading completed", description: "Count chapters, pages, books, or passages studied.", progressType: "number", icon: "count", units: ["chapters", "pages", "books", "passages"], defaultUnit: "chapters", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("faith", { id: "faith.practice", label: "Practice completed", description: "Count prayer, reflection, service, or study sessions.", progressType: "number", icon: "count", units: ["sessions", "practices", "hours"], defaultUnit: "sessions", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("faith", { id: "faith.streak", label: "Daily spiritual practice", description: "Keep a daily prayer, reading, or reflection streak.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("faith", { id: "faith.path", label: "Faith journey stages", description: "Move through a course, study plan, or service commitment.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Choose the commitment", "Begin the practice", "Reach the first checkpoint", "Deepen the work", "Complete and reflect"] }),
  ],
  other: [
    metric("other", { id: "other.count", label: "A number I choose", description: "Track any count with a standard or custom unit.", progressType: "number", icon: "count", units: ["items", "tasks", "sessions", "units"], defaultUnit: "items", directions: ["increase", "decrease"], defaultDirection: "increase", defaultStartValue: 0, allowsCustomUnit: true }),
    metric("other", { id: "other.streak", label: "Daily streak", description: "Show up every day and protect the chain.", progressType: "streak", icon: "streak", units: ["days"], defaultUnit: "days", directions: ["increase"], defaultDirection: "increase", defaultStartValue: 0, suggestedTargetValue: 30 }),
    metric("other", { id: "other.plan", label: "Milestone plan", description: "Break the goal into a sequence of named steps.", progressType: "milestones", icon: "plan", units: ["milestones"], defaultUnit: "milestones", directions: ["increase"], defaultDirection: "increase", milestones: ["Define the outcome", "Take the first step", "Reach halfway", "Finish the main work", "Complete the goal"] }),
  ],
};

export const DEFAULT_METRIC_BY_CATEGORY: Record<string, string> = {
  health: "health.body-weight",
  learning: "learning.material",
  career: "career.search-activity",
  launch: "launch.plan",
  creative: "creative.output",
  habit: "habit.daily",
  sports: "sports.distance",
  community: "community.people",
  personal: "personal.plan",
  travel: "travel.places",
  family: "family.activities",
  faith: "faith.streak",
  other: "other.plan",
};

function customMetric(categoryId: string): GoalMeasurementMetric {
  return metric(categoryId, {
    id: `${categoryId}.custom-count`,
    label: "Another measurable number",
    description: "Choose your own unit and whether the number should rise or fall.",
    progressType: "number",
    icon: "count",
    units: ["items", "sessions", "units"],
    defaultUnit: "items",
    directions: ["increase", "decrease"],
    defaultDirection: "increase",
    defaultStartValue: 0,
    allowsCustomUnit: true,
  });
}

export function getMeasurementsForCategory(categoryId: string): GoalMeasurementMetric[] {
  const base = CATALOG[categoryId] ?? CATALOG.other;
  return base.some((item) => item.allowsCustomUnit) ? base : [...base, customMetric(categoryId)];
}

export function getMeasurementMetric(categoryId: string, metricId: string | undefined) {
  if (!metricId) return undefined;
  return getMeasurementsForCategory(categoryId).find((item) => item.id === metricId);
}

export function getDefaultMeasurement(categoryId: string) {
  const metrics = getMeasurementsForCategory(categoryId);
  return (
    metrics.find((item) => item.id === DEFAULT_METRIC_BY_CATEGORY[categoryId]) ??
    metrics[0]
  );
}

export function measurementAllowsUnit(metricDefinition: GoalMeasurementMetric, unit: string) {
  const normalized = unit.trim().toLowerCase();
  return (
    metricDefinition.allowsCustomUnit ||
    metricDefinition.units.some((item) => item.toLowerCase() === normalized)
  );
}

export function inferMeasurementMetric(
  categoryId: string,
  progressType: MeasurementProgressType,
  unit: string,
  direction: MeasurementDirection
) {
  const metrics = getMeasurementsForCategory(categoryId);
  const matchingType = metrics.filter((item) => item.progressType === progressType);
  if (progressType === "number") {
    return (
      matchingType.find(
        (item) =>
          !item.allowsCustomUnit &&
          measurementAllowsUnit(item, unit) &&
          item.directions.includes(direction)
      ) ??
      matchingType.find(
        (item) => measurementAllowsUnit(item, unit) && item.directions.includes(direction)
      ) ??
      matchingType.find((item) => item.allowsCustomUnit) ??
      customMetric(categoryId)
    );
  }
  return matchingType[0] ?? getDefaultMeasurement(categoryId);
}
