/**
 * Shared cadence math for check-in reminders (email cron + UI).
 * Keep this free of Convex ctx so the client can use the same numbers.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function supportCadenceDays(
  frequency: string | undefined
): number | null {
  if (frequency === "daily") return 1;
  if (frequency === "weekly") return 7;
  if (frequency === "monthly") return 30;
  return null;
}

export function pledgeCadenceDays(frequency: string | undefined): number | null {
  if (frequency === "weekly") return 7;
  if (frequency === "monthly") return 30;
  return null;
}

export function daysSince(lastActivity: number, now: number): number {
  return Math.max(0, Math.floor((now - lastActivity) / DAY_MS));
}

export function isCadenceOverdue(
  lastActivity: number,
  cadenceDays: number,
  now: number
): boolean {
  return now - lastActivity >= cadenceDays * DAY_MS;
}

/** True if we already sent a reminder for this overdue window. */
export function alreadyRemindedThisCycle(
  lastActivity: number,
  lastReminderAt: number | undefined,
): boolean {
  return Boolean(lastReminderAt && lastReminderAt > lastActivity);
}

export function isAfterUpdateDue(
  lastCheckInAt: number | null | undefined,
  lastUpdateAt: number | null | undefined,
  joinedAt: number
): boolean {
  if (!lastUpdateAt) return false;
  if (lastUpdateAt < joinedAt) return false;
  const lastCheck = lastCheckInAt ?? 0;
  return lastUpdateAt > lastCheck;
}
