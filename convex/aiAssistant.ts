import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod/v4";
import { components, internal } from "./_generated/api";
import { action } from "./_generated/server";

const taskValidator = v.union(
  v.literal("shapeGoal"),
  v.literal("suggestMilestones"),
  v.literal("draftStory"),
  v.literal("rewriteUpdate")
);

const draftValidator = v.object({
  category: v.optional(v.string()),
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  story: v.optional(v.string()),
  progressType: v.optional(
    v.union(
      v.literal("number"),
      v.literal("streak"),
      v.literal("milestones")
    )
  ),
  direction: v.optional(v.union(v.literal("increase"), v.literal("decrease"))),
  unit: v.optional(v.string()),
  startValue: v.optional(v.number()),
  targetValue: v.optional(v.number()),
  milestones: v.optional(v.array(v.string())),
  updateText: v.optional(v.string()),
});

const suggestionValidator = v.object({
  task: taskValidator,
  title: v.union(v.string(), v.null()),
  summary: v.union(v.string(), v.null()),
  story: v.union(v.string(), v.null()),
  milestones: v.array(v.string()),
  updateText: v.union(v.string(), v.null()),
  rationale: v.string(),
});

const suggestionSchema = z.object({
  title: z.string().max(120).nullable(),
  summary: z.string().max(280).nullable(),
  story: z.string().max(3_000).nullable(),
  milestones: z.array(z.string().max(120)).max(8),
  updateText: z.string().max(2_000).nullable(),
  rationale: z.string().max(280),
});

const formAssistant = new Agent(components.agent, {
  name: "Goal form assistant",
  languageModel: openai.responses("gpt-5.6-luna"),
  instructions: [
    "You help people express goals and progress updates clearly and warmly.",
    "Keep the user's voice. Never invent facts, achievements, dates, numbers, diagnoses, or promises.",
    "Preserve every number and unit exactly unless the user explicitly asks to change it.",
    "Return only the fields requested by the task and use null or an empty array for all others.",
    "Suggestions are drafts that the user will review before applying.",
  ].join(" "),
  contextOptions: { recentMessages: 0 },
  storageOptions: { saveMessages: "none" },
});

type Task =
  | "shapeGoal"
  | "suggestMilestones"
  | "draftStory"
  | "rewriteUpdate";

type Draft = {
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

const MAX_OUTPUT_TOKENS: Record<Task, number> = {
  shapeGoal: 320,
  suggestMilestones: 420,
  draftStory: 900,
  rewriteUpdate: 360,
};

const FIELD_LIMITS: Array<[keyof Draft, number]> = [
  ["category", 40],
  ["title", 120],
  ["summary", 280],
  ["story", 3_000],
  ["unit", 40],
  ["updateText", 2_000],
];

function validateDraft(task: Task, draft: Draft) {
  if (JSON.stringify(draft).length > 8_000) {
    throw new ConvexError({
      code: "AI_INPUT_TOO_LONG",
      message: "This draft is too long for AI help.",
    });
  }

  for (const [field, max] of FIELD_LIMITS) {
    const value = draft[field];
    if (typeof value === "string" && value.length > max) {
      throw new ConvexError({
        code: "AI_INPUT_TOO_LONG",
        field,
        message: `${field} is too long for AI help.`,
      });
    }
  }

  if (
    draft.milestones &&
    (draft.milestones.length > 8 ||
      draft.milestones.some((milestone) => milestone.length > 120))
  ) {
    throw new ConvexError({
      code: "AI_INPUT_TOO_LONG",
      field: "milestones",
      message: "Use up to 8 milestones of 120 characters each.",
    });
  }

  const hasGoalContext = Boolean(draft.title?.trim() || draft.summary?.trim());
  if (
    (task === "shapeGoal" || task === "suggestMilestones") &&
    !hasGoalContext
  ) {
    throw new ConvexError({
      code: "AI_INPUT_REQUIRED",
      message: "Add a rough goal title or summary first.",
    });
  }
  if (
    task === "draftStory" &&
    !hasGoalContext &&
    !draft.story?.trim()
  ) {
    throw new ConvexError({
      code: "AI_INPUT_REQUIRED",
      message: "Add a rough goal title, summary, or story first.",
    });
  }
  if (task === "rewriteUpdate" && !draft.updateText?.trim()) {
    throw new ConvexError({
      code: "AI_INPUT_REQUIRED",
      message: "Write a rough update first.",
    });
  }
}

function buildPrompt(task: Task, draft: Draft) {
  const taskInstruction: Record<Task, string> = {
    shapeGoal:
      "Improve the goal title and one-sentence summary. Return title and summary only.",
    suggestMilestones:
      "Suggest 3 to 6 concrete, ordered milestones that fit this goal. Return milestones only.",
    draftStory:
      "Draft a first-person story explaining why the goal matters and what support would help. Return story only.",
    rewriteUpdate:
      "Polish the progress update so it is concise, honest, and encouraging. Do not imply more progress than the user wrote. Return updateText only.",
  };

  return [
    `Task: ${taskInstruction[task]}`,
    "Do not add missing facts. If the draft is already clear, make only light edits.",
    "Current user draft:",
    JSON.stringify(draft),
  ].join("\n");
}

async function safetyIdentifier(userId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(userId)
  );
  return `gmm_${Array.from(new Uint8Array(digest))
    .slice(0, 30)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function trimmedOrNull(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export const suggest = action({
  args: {
    task: taskValidator,
    draft: draftValidator,
  },
  returns: suggestionValidator,
  handler: async (ctx, { task, draft }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "AI_AUTH_REQUIRED",
        message: "Sign in to use AI help.",
      });
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message: "AI help is not configured yet.",
      });
    }
    if (process.env.AI_DISABLED === "1") {
      throw new ConvexError({
        code: "AI_DISABLED",
        message: "AI help is temporarily paused.",
      });
    }

    validateDraft(task, draft);
    const configuredBudget = Number(process.env.AI_DAILY_BUDGET_USD ?? "5");
    const dailyBudgetMicros =
      (Number.isFinite(configuredBudget) && configuredBudget > 0
        ? configuredBudget
        : 5) * 1_000_000;
    const dailySpendMicros = await ctx.runQuery(
      internal.aiOperations.dailySpendMicros,
      {}
    );
    if (dailySpendMicros >= dailyBudgetMicros) {
      throw new ConvexError({
        code: "AI_BUDGET_LIMIT",
        message: "AI help has reached today's service budget. Please try again tomorrow.",
      });
    }
    await ctx.runMutation(internal.aiRateLimits.consume, {
      userId,
      feature: "formAssist",
    });

    try {
      const result = await formAssistant.generateObject(
        ctx,
        { userId: String(userId) },
        {
          prompt: buildPrompt(task, draft),
          schema: suggestionSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS[task],
          maxRetries: 2,
          providerOptions: {
            openai: {
              reasoningEffort: "none",
              safetyIdentifier: await safetyIdentifier(String(userId)),
              store: false,
              strictJsonSchema: true,
              textVerbosity: "low",
            },
          },
        },
        {
          contextOptions: { recentMessages: 0 },
          storageOptions: { saveMessages: "none" },
        }
      );

      await ctx.runMutation(internal.aiOperations.recordUsage, {
        userId,
        feature: "formAssist",
        model: "gpt-5.6-luna",
        source: "model",
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        cachedInputTokens:
          result.usage.cachedInputTokens ??
          result.usage.inputTokenDetails?.cacheReadTokens ??
          0,
      });

      return {
        task,
        title: trimmedOrNull(result.object.title),
        summary: trimmedOrNull(result.object.summary),
        story: trimmedOrNull(result.object.story),
        milestones: result.object.milestones
          .map((milestone) => milestone.trim())
          .filter(Boolean)
          .slice(0, 8),
        updateText: trimmedOrNull(result.object.updateText),
        rationale:
          result.object.rationale.trim() ||
          "Review this draft and apply it if it feels right.",
      };
    } catch (error) {
      const safeError = error as { name?: string; statusCode?: number };
      console.error("[aiAssistant] generation failed", {
        name: safeError?.name ?? "UnknownError",
        statusCode: safeError?.statusCode,
      });
      throw new ConvexError({
        code: "AI_UNAVAILABLE",
        message:
          "AI help is temporarily unavailable. Your draft is safe, so try again in a moment.",
      });
    }
  },
});
