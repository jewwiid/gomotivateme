/**
 * Goal categories — shared between the create form and the public page.
 *
 * Modelled on the GoFundMe category set: cause-oriented rather than
 * activity-oriented (the original "weight / fitness / learning" was
 * personal-progress; the new list is broader, covering personal
 * milestones as well as community, charity and family).
 */
export const CATEGORIES = [
  {
    id: "medical",
    label: "Medical",
    icon: "stethoscope",
    defaultDirection: "decrease" as const,
    hint: "treatments, days",
  },
  {
    id: "memorial",
    label: "Memorial",
    icon: "flame",
    defaultDirection: "increase" as const,
    hint: "any unit",
  },
  {
    id: "emergency",
    label: "Emergency",
    icon: "siren",
    defaultDirection: "increase" as const,
    hint: "any unit",
  },
  {
    id: "charity",
    label: "Charity",
    icon: "heart-handshake",
    defaultDirection: "increase" as const,
    hint: "$ raised",
  },
  {
    id: "education",
    label: "Education",
    icon: "graduation-cap",
    defaultDirection: "increase" as const,
    hint: "books, hours, courses",
  },
  {
    id: "animal",
    label: "Animal",
    icon: "paw-print",
    defaultDirection: "increase" as const,
    hint: "rescues, miles",
  },
  {
    id: "environment",
    label: "Environment",
    icon: "leaf",
    defaultDirection: "increase" as const,
    hint: "trees, lbs",
  },
  {
    id: "business",
    label: "Business",
    icon: "briefcase",
    defaultDirection: "increase" as const,
    hint: "$ saved, customers",
  },
  {
    id: "community",
    label: "Community",
    icon: "users",
    defaultDirection: "increase" as const,
    hint: "people, events",
  },
  {
    id: "competition",
    label: "Competition",
    icon: "trophy",
    defaultDirection: "increase" as const,
    hint: "rank, score, wins",
  },
  {
    id: "creative",
    label: "Creative",
    icon: "palette",
    defaultDirection: "increase" as const,
    hint: "pages, songs, projects",
  },
  {
    id: "event",
    label: "Event",
    icon: "calendar",
    defaultDirection: "increase" as const,
    hint: "attendees, RSVPs",
  },
  {
    id: "faith",
    label: "Faith",
    icon: "church",
    defaultDirection: "increase" as const,
    hint: "any unit",
  },
  {
    id: "family",
    label: "Family",
    icon: "users-round",
    defaultDirection: "increase" as const,
    hint: "any unit",
  },
  {
    id: "sports",
    label: "Sports",
    icon: "dumbbell",
    defaultDirection: "increase" as const,
    hint: "reps, miles, time",
  },
  {
    id: "travel",
    label: "Travel",
    icon: "plane",
    defaultDirection: "increase" as const,
    hint: "places, miles, days",
  },
  {
    id: "volunteer",
    label: "Volunteer",
    icon: "hand-heart",
    defaultDirection: "increase" as const,
    hint: "hours",
  },
  {
    id: "wishes",
    label: "Wishes",
    icon: "sparkles",
    defaultDirection: "increase" as const,
    hint: "any unit",
  },
] as const;

/**
 * The subset surfaced as featured filter pills on the home page. The
 * full list lives in CATEGORIES; FEATURED is what visitors see when they
 * first hit the discover feed. Picking the broadly appealing + positive
 * ones; the heavier / more sensitive categories (Medical, Memorial,
 * Emergency) still work when selected from the create form but don't
 * lead the home page.
 */
export const FEATURED_CATEGORIES = CATEGORIES.filter((c) =>
  [
    "charity",
    "education",
    "animal",
    "environment",
    "community",
    "creative",
  ].includes(c.id)
);

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategory(id: string) {
  return (
    CATEGORIES.find((c) => c.id === id) ??
    // Last-resort fallback. Should be unreachable because the server
    // validator only accepts CATEGORIES ids, but display-side we still
    // want a sane default for legacy rows.
    CATEGORIES[CATEGORIES.length - 1]
  );
}
