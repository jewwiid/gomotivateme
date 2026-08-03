/**
 * Date / number / name formatting helpers.
 */

/**
 * Format a full name for public display as "First L." (first name + last
 * initial + period). Falls back gracefully for single names, empty, or null.
 *
 *   "Jude Okun"      → "Jude O."
 *   "Jude"           → "Jude"
 *   "Jude A. Smith"  → "Jude A."
 *   null / ""        → "Someone"
 */
export function displayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Someone";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  return formatDate(ms);
}

export function formatNumber(n: number, maxFractionDigits: number = 1): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: maxFractionDigits,
  });
}
