export const COOKIE_CONSENT_STORAGE_KEY = "gomotivateme.cookieConsent";
export const COOKIE_CONSENT_VERSION = 2;

export type CookieConsentRecord = {
  version: number;
  analytics: boolean;
  at: number;
};

declare global {
  interface Window {
    datafast?: ((goal: string, parameters?: Record<string, string>) => void) & {
      q?: IArguments[];
    };
  }
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (
      value.version !== COOKIE_CONSENT_VERSION ||
      typeof value.analytics !== "boolean" ||
      typeof value.at !== "number"
    ) {
      return null;
    }
    return value as CookieConsentRecord;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}

/**
 * Sends a consent-gated DataFast goal. Call this only after an action has
 * succeeded. Never pass goal copy, names, email addresses, or other user text.
 */
export function trackDataFastGoal(
  goal: string,
  parameters?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !window.datafast) {
    return;
  }

  const safeParameters = parameters
    ? Object.fromEntries(
        Object.entries(parameters)
          .slice(0, 10)
          .map(([key, value]) => [key, String(value).slice(0, 255)])
      )
    : undefined;

  window.datafast(goal, safeParameters);
}
