const DEFAULT_AIBL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "https://www.iamaibl.com",
  "https://iamaibl.com",
];

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSecret(prefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

export function allowedAiblOrigins(): string[] {
  const extra = (process.env.AIBL_REDIRECT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/\/$/, ""))
    .filter(Boolean);
  return [...DEFAULT_AIBL_ORIGINS, ...extra];
}

export function isAllowedAiblRedirectUri(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.pathname !== "/connect/gmm") return false;
  if (url.hash || url.username || url.password) return false;
  const origin = url.origin.toLowerCase();
  const allowed = new Set(allowedAiblOrigins().map((value) => value.toLowerCase()));
  if (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    return allowed.has(origin);
  }
  if (url.protocol !== "https:") return false;
  return allowed.has(origin);
}

export function publicSiteUrl(): string {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.gomotivateme.com"
  ).replace(/\/$/, "");
}
