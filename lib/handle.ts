/**
 * Handle validation shared between client (signup form, settings) and
 * server (users.setHandle mutation). The regex MUST stay in sync with
 * the HANDLE_RE in convex/users.ts — the client check is a hint, the
 * server check is the source of truth.
 */
export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$/;
export const MIN_HANDLE_LENGTH = 3;
export const MAX_HANDLE_LENGTH = 30;

/**
 * Normalize a free-form display name into a handle candidate.
 * "Jude Okun" → "jude-okun", "Sarah O'Connor" → "sarah-oconnor",
 * "José García" → "jose-garcia". Best-effort — the user can edit before submit.
 */
export function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HANDLE_LENGTH);
}

/**
 * Returns null when the handle is valid OR empty (so we don't show an error
 * before the user has typed anything). Returns a human-readable string
 * describing the problem otherwise.
 */
export function validateHandleClient(handle: string): string | null {
  const trimmed = handle.toLowerCase().trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_HANDLE_LENGTH) {
    return `${MIN_HANDLE_LENGTH} characters minimum`;
  }
  if (trimmed.length > MAX_HANDLE_LENGTH) {
    return `Max ${MAX_HANDLE_LENGTH} characters`;
  }
  if (!HANDLE_RE.test(trimmed)) {
    return "Lowercase letters, digits, _ or -";
  }
  return null;
}
