export type AiTask =
  | "shapeGoal"
  | "suggestMilestones"
  | "draftStory"
  | "rewriteUpdate";

export type AiDraft = {
  category?: string;
  title?: string;
  summary?: string;
  story?: string;
  progressType?: "number" | "streak" | "milestones";
  direction?: "increase" | "decrease";
  unit?: string;
  startValue?: number;
  targetValue?: number;
  milestones?: string[];
  updateText?: string;
};

export type AiSuggestion = {
  task: AiTask;
  title: string | null;
  summary: string | null;
  story: string | null;
  milestones: string[];
  updateText: string | null;
  rationale: string;
};

type AiErrorData = {
  code?: string;
  limit?: "burst" | "daily" | "service";
  retryAfterMs?: number;
  message?: string;
};

function retryLabel(milliseconds: number | undefined) {
  if (!milliseconds || !Number.isFinite(milliseconds)) return "a little while";
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function aiAssistantErrorMessage(error: unknown) {
  const data =
    error && typeof error === "object" && "data" in error
      ? ((error as { data?: AiErrorData }).data ?? {})
      : {};

  if (data.code === "AI_RATE_LIMITED") {
    const retry = retryLabel(data.retryAfterMs);
    if (data.limit === "daily") {
      return `You've used today's 30 AI assists. Try again in ${retry}.`;
    }
    if (data.limit === "service") {
      return `AI help is busy right now. Try again in ${retry}.`;
    }
    return `You've used 5 AI assists in a short period. Try again in ${retry}.`;
  }

  if (data.message) return data.message;
  if (error instanceof Error && !error.message.includes("Server Error")) {
    return error.message;
  }
  return "AI help is temporarily unavailable. Your draft is safe—please try again.";
}
