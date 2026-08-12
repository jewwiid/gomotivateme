/**
 * Canonical site origin, in one place.
 *
 * The apex domain 308-redirects to www, so www is the canonical host —
 * every absolute URL we emit (canonicals, OG images, sitemap) must use it
 * or search engines see two hosts for the same page.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gomotivateme.com"
).replace(/\/$/, "");

export const SITE_NAME = "GoMotivateMe";

export const SITE_TAGLINE = "Where personal goals get done";

export const SITE_DESCRIPTION =
  "Set a goal, build a support team, and keep going with encouragement from people who want to see you succeed.";

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}
