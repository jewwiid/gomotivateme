/**
 * Deterministic risk review for a goal.
 *
 * This is intentionally free of both Convex and AI: it reads the numbers the app
 * already stores and names what is going wrong. Running a language model over every
 * goal on a schedule would multiply cost against the daily AI budget, and most
 * stalls are obvious from update cadence, milestone completion, and pace against the
 * target date. The AI is better spent on the recovery plan once a blocker is known.
 */

export const DAY_MS = 86_400_000;

export type RiskBlocker =
  | "time"
  | "motivation"
  | "too_big"
  | "unclear"
  | "outside_control"
  | "other";

export type RiskSeverity = "warn" | "high";

export type RiskSignal = {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  /** Which recovery blocker this signal argues for. */
  blocker: RiskBlocker;
};

export type GoalRiskInput = {
  status: string;
  progressType: "number" | "streak" | "milestones";
  direction: "increase" | "decrease";
  startValue?: number | null;
  currentValue?: number | null;
  targetValue: number;
  targetDate?: number | null;
  createdAt: number;
  launchedAt?: number | null;
  milestones: Array<{ done: boolean; completedAt?: number | null }>;
  /** Newest first or oldest first both work; only timestamps are read. */
  updates: Array<{ createdAt: number }>;
};

export type GoalReview = {
  signals: RiskSignal[];
  primaryBlocker: RiskBlocker | null;
  quietDays: number;
  progressFraction: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** How far along the goal is, on a 0–1 scale, whichever way it is measured. */
export function progressFraction(input: GoalRiskInput) {
  if (input.progressType === "milestones") {
    const total = input.milestones.length;
    if (!total) return 0;
    return clamp01(input.milestones.filter((m) => m.done).length / total);
  }

  const current = input.currentValue ?? input.startValue ?? 0;
  const start = input.startValue ?? 0;
  const target = input.targetValue;

  if (input.progressType === "streak") {
    return target > 0 ? clamp01(current / target) : 0;
  }

  const span =
    input.direction === "increase" ? target - start : start - target;
  if (span === 0) return current === target ? 1 : 0;
  const done = input.direction === "increase" ? current - start : start - current;
  return clamp01(done / span);
}

function daysBetween(from: number, to: number) {
  return Math.floor((to - from) / DAY_MS);
}

/**
 * @param now Passed in rather than read from the clock so the result is a pure
 *   function of its inputs and can be tested at fixed points in time.
 */
export function reviewGoal(input: GoalRiskInput, now: number): GoalReview {
  const signals: RiskSignal[] = [];
  const fraction = progressFraction(input);

  // Only live goals can be "at risk"; drafts and finished goals are not stalled.
  if (input.status !== "active") {
    return { signals: [], primaryBlocker: null, quietDays: 0, progressFraction: fraction };
  }

  const startedAt = input.launchedAt ?? input.createdAt;
  const lastUpdateAt = input.updates.reduce(
    (latest, update) => Math.max(latest, update.createdAt),
    0
  );
  const lastActivityAt = Math.max(lastUpdateAt, startedAt);
  const quietDays = Math.max(0, daysBetween(lastActivityAt, now));
  const ageDays = Math.max(0, daysBetween(startedAt, now));

  // 1. Silence. The single strongest predictor that a goal has been dropped.
  if (quietDays >= 21) {
    signals.push({
      id: "quiet",
      severity: "high",
      title: `${quietDays} quiet days`,
      detail: `Nothing has been logged since ${quietDays} days ago.`,
      blocker: "motivation",
    });
  } else if (quietDays >= 10) {
    signals.push({
      id: "quiet",
      severity: "warn",
      title: `${quietDays} quiet days`,
      detail: `The last update was ${quietDays} days ago.`,
      blocker: "motivation",
    });
  }

  // 2. The deadline, against how much is actually done.
  if (input.targetDate) {
    const daysLeft = daysBetween(now, input.targetDate);
    const percent = Math.round(fraction * 100);

    if (daysLeft < 0) {
      signals.push({
        id: "overdue",
        severity: "high",
        title: "Target date has passed",
        detail: `The date was ${Math.abs(daysLeft)} days ago and progress is at ${percent}%.`,
        blocker: "time",
      });
    } else if (daysLeft <= 14 && fraction < 0.75) {
      signals.push({
        id: "deadline",
        severity: "high",
        title: `${daysLeft} days left, ${percent}% done`,
        detail: "The remaining time is unlikely to cover the remaining work.",
        blocker: "time",
      });
    } else if (daysLeft <= 30 && fraction < 0.4) {
      signals.push({
        id: "deadline",
        severity: "warn",
        title: `${daysLeft} days left, ${percent}% done`,
        detail: "Progress is behind where the target date needs it to be.",
        blocker: "time",
      });
    }
  }

  // 3. Pace: is the observed rate enough to finish on time?
  if (input.targetDate && ageDays >= 7) {
    const totalDays = Math.max(1, daysBetween(startedAt, input.targetDate));
    const elapsedFraction = clamp01(ageDays / totalDays);
    // Only meaningful once a real slice of the window has gone by.
    if (elapsedFraction >= 0.35 && fraction < elapsedFraction * 0.6) {
      signals.push({
        id: "pace",
        severity: "warn",
        title: "Falling behind pace",
        detail: `${Math.round(elapsedFraction * 100)}% of the time is gone but ${Math.round(fraction * 100)}% of the goal is done.`,
        blocker: "time",
      });
    }
  }

  // 4. Milestones defined but not moving — usually a sign the next step is too big.
  const remaining = input.milestones.filter((m) => !m.done);
  if (input.milestones.length > 0 && remaining.length > 0) {
    const lastDoneAt = input.milestones.reduce(
      (latest, milestone) => Math.max(latest, milestone.completedAt ?? 0),
      0
    );
    const sinceMilestone = daysBetween(Math.max(lastDoneAt, startedAt), now);
    if (sinceMilestone >= 21) {
      signals.push({
        id: "milestones-stuck",
        severity: "warn",
        title: "Milestones not moving",
        detail:
          lastDoneAt > 0
            ? `No milestone has been ticked off in ${sinceMilestone} days.`
            : `No milestone has been completed in the ${sinceMilestone} days since launch.`,
        blocker: "too_big",
      });
    }
  }

  // 5. A milestone-tracked goal with no milestones has nothing to make progress
  //     against. Number and streak goals legitimately have none, so this is scoped
  //     to the one progress type where their absence is a defect.
  if (
    input.progressType === "milestones" &&
    input.milestones.length === 0 &&
    ageDays >= 7
  ) {
    signals.push({
      id: "no-milestones",
      severity: "warn",
      title: "No steps defined",
      detail: "This goal is tracked by milestones, but none have been added yet.",
      blocker: "unclear",
    });
  }

  const ranked = [...signals].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1
  );

  return {
    signals: ranked,
    primaryBlocker: ranked[0]?.blocker ?? null,
    quietDays,
    progressFraction: fraction,
  };
}
