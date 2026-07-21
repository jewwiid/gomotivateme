/**
 * Goal categories — shared between the create form and the public page.
 */
export const CATEGORIES = [
  { id: "weight", label: "Weight", icon: "scale", defaultDirection: "decrease" as const, hint: "kg or lbs" },
  { id: "fitness", label: "Fitness", icon: "dumbbell", defaultDirection: "increase" as const, hint: "reps, miles, minutes" },
  { id: "learning", label: "Learning", icon: "book", defaultDirection: "increase" as const, hint: "books, hours, courses" },
  { id: "habit", label: "Habit", icon: "repeat", defaultDirection: "increase" as const, hint: "days streak" },
  { id: "creative", label: "Creative", icon: "palette", defaultDirection: "increase" as const, hint: "pages, songs, projects" },
  { id: "business", label: "Business", icon: "briefcase", defaultDirection: "increase" as const, hint: "$ saved, customers, calls" },
  { id: "custom", label: "Custom", icon: "sparkles", defaultDirection: "increase" as const, hint: "any unit" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
