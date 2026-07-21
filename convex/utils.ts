/**
 * Server-side helpers used across Convex functions.
 */

/**
 * Slug alphabet: lowercase a-z + 0-9, ambiguous chars removed (0/O, 1/l/I).
 */
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SLUG_LENGTH = 5;

/** Cryptographically-random integer in [0, max). */
function randomInt(max: number): number {
  // crypto.getRandomValues is available in the Convex runtime.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % max;
}

function randomFragment(length: number = SLUG_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }
  return out;
}

/**
 * Build a human-friendly URL slug from a goal title plus a random suffix.
 * Example: "Lose 20kg by summer" -> "lose-20kg-by-summer-a1b2c"
 */
export function buildSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const fragment = randomFragment();
  return base ? `${base}-${fragment}` : fragment;
}

/**
 * Compute the percent progress from start → current toward target, clamped 0..100.
 * Direction: "decrease" means startValue > targetValue (e.g. weight loss).
 */
export function computeProgress(
  startValue: number,
  currentValue: number,
  targetValue: number,
  direction: "increase" | "decrease"
): number {
  const totalDelta = direction === "decrease" ? startValue - targetValue : targetValue - startValue;
  if (totalDelta <= 0) return 0; // degenerate goal
  const moved =
    direction === "decrease" ? startValue - currentValue : currentValue - startValue;
  const pct = (moved / totalDelta) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return Math.round(pct * 10) / 10;
}

const MILESTONE_TIERS: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];

/**
 * Find which milestone tiers (25, 50, 75, 100) have been newly reached given a progress %.
 * Returns tiers the caller hasn't already awarded.
 */
export function newMilestoneTiers(
  pct: number,
  alreadyAwarded: Array<25 | 50 | 75 | 100>
): Array<25 | 50 | 75 | 100> {
  return MILESTONE_TIERS.filter((t) => pct >= t && !alreadyAwarded.includes(t));
}

/**
 * Days remaining until target date (negative if overdue). Rounded toward zero for display.
 */
export function daysUntil(targetDateMs: number, nowMs: number): number {
  const diffMs = targetDateMs - nowMs;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
