"use client";

import { useEffect, useState } from "react";

const DAY_MS = 86_400_000;
/** Re-check at least hourly so a suspended tab still catches up. */
const MAX_TICK_MS = 3_600_000;

/**
 * Date key in the browser convention where positive offsets are behind UTC,
 * matching `localDayKey` in convex/goals.ts.
 */
export function localDayKey(timestamp: number, offsetMinutes: number) {
  return new Date(timestamp - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/**
 * Mirrors `STREAK_GRACE_MS` in convex/goals.ts — how long after local midnight
 * a log may still be credited to the previous day.
 */
const GRACE_MS = 4 * 3_600_000;

/** Milliseconds elapsed since the viewer's local midnight. */
function msSinceLocalMidnight(timestamp: number, offsetMinutes: number) {
  return (((timestamp - offsetMinutes * 60_000) % DAY_MS) + DAY_MS) % DAY_MS;
}

/** True while a log may still be credited to yesterday instead of today. */
export function withinStreakGrace(timestamp = Date.now()) {
  return msSinceLocalMidnight(timestamp, new Date().getTimezoneOffset()) < GRACE_MS;
}

/**
 * The viewer's current local day key, recomputed when the day rolls over.
 *
 * Deliberately reads the browser's live offset rather than a goal's stored
 * `streakTimezoneOffsetMinutes`: `goals.logStreakDay` answers "already logged
 * today?" using the offset the client sends with the mutation, so keying the
 * UI off the stored offset makes the button disagree with the server after a
 * DST change or a trip — it says "Done for today" on a day the server would
 * accept, or offers "Mark today" and then throws "Already logged today".
 */
export function useLocalDayKey() {
  const [dayKey, setDayKey] = useState(() =>
    localDayKey(Date.now(), new Date().getTimezoneOffset())
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = Date.now();
      const offset = new Date().getTimezoneOffset();
      const next = localDayKey(now, offset);
      setDayKey((current) => (current === next ? current : next));
      const elapsed = msSinceLocalMidnight(now, offset);
      timer = setTimeout(tick, Math.min(DAY_MS - elapsed + 1_000, MAX_TICK_MS));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return dayKey;
}

/**
 * Render a `YYYY-MM-DD` day key as a calendar date. Reads the parts in UTC
 * because a day key is a plain calendar day, not an instant — running it
 * through `formatDate` would shift it a day for viewers behind UTC.
 */
export function formatDayKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** The local day key immediately before `dayKey` (both `YYYY-MM-DD`). */
export function previousDayKey(dayKey: string) {
  return new Date(new Date(`${dayKey}T00:00:00Z`).getTime() - DAY_MS)
    .toISOString()
    .slice(0, 10);
}
