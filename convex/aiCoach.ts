import { Agent } from "@convex-dev/agent";
import { getAuthUserId } from "@convex-dev/auth/server";
import { openai } from "@ai-sdk/openai";
import { ConvexError, v } from "convex/values";
import { z } from "zod/v4";
import { api, components, internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const MODEL = "gpt-5.6-luna";
const DAY = 24 * 60 * 60 * 1000;

type AiFeature =
  | "supportDraft"
  | "checkInDraft"
  | "nextAction"
  | "recoveryPlan"
  | "weeklyRecap"
  | "inviteDraft"
  | "applicationSummary";

type WritingResult = {
  suggestions: Array<{ text: string; angle: string }>;
  rationale: string;
  usageEventId: Id<"aiUsageEvents">;
};

type NextActionResult = {
  headline: string;
  action: string;
  reason: string;
  updatePrompt: string;
  usageEventId: Id<"aiUsageEvents">;
};

type RecoveryResult = {
  headline: string;
  steps: string[];
  adjustment: string | null;
  encouragement: string;
  usageEventId: Id<"aiUsageEvents">;
};

type RecapResult = {
  narrative: string;
  reflectionQuestion: string;
  highlight: string;
  usageEventId: Id<"aiUsageEvents">;
};

type InviteResult = {
  message: string;
  rationale: string;
  usageEventId: Id<"aiUsageEvents">;
};

type ApplicationSummaryResult = {
  overview: string;
  applications: Array<{
    index: number;
    intent: string;
    clarifyQuestion: string | null;
    caution: string | null;
  }>;
  usageEventId: Id<"aiUsageEvents">;
};

const supportTypeValidator = v.union(
  v.literal("encourage"),
  v.literal("experience"),
  v.literal("advice"),
  v.literal("checkin"),
  v.literal("join")
);

const roleValidator = v.union(
  v.literal("encourager"),
  v.literal("accountability"),
  v.literal("advice"),
  v.literal("review"),
  v.literal("challenge")
);

const frequencyValidator = v.union(
  v.literal("afterUpdate"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("onRequest")
);

const recoveryBlockerValidator = v.union(
  v.literal("time"),
  v.literal("motivation"),
  v.literal("too_big"),
  v.literal("unclear"),
  v.literal("outside_control"),
  v.literal("other")
);

const assistant = new Agent(components.agent, {
  name: "Momentum support assistant",
  languageModel: openai.responses(MODEL),
  instructions: [
    "You help people take a realistic next step and help their supporters show up thoughtfully.",
    "Use only the supplied facts. Never invent progress, relationships, diagnoses, dates, or promises.",
    "Keep suggestions warm, specific, brief, and easy to edit.",
    "Never make medical, legal, financial, or crisis recommendations.",
    "Never approve, decline, rank, or judge a motivator application.",
    "Everything you return is an optional draft that a person must review before using.",
  ].join(" "),
  contextOptions: { recentMessages: 0 },
  storageOptions: { saveMessages: "none" },
});

const writingSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        angle: z.string().min(1).max(60),
      })
    )
    .min(2)
    .max(3),
  rationale: z.string().max(220),
});

const nextActionSchema = z.object({
  headline: z.string().max(80),
  action: z.string().max(240),
  reason: z.string().max(280),
  updatePrompt: z.string().max(180),
});

const recoverySchema = z.object({
  headline: z.string().max(100),
  steps: z.array(z.string().max(180)).min(1).max(3),
  adjustment: z.string().max(240).nullable(),
  encouragement: z.string().max(180),
});

const recapSchema = z.object({
  narrative: z.string().max(500),
  reflectionQuestion: z.string().max(180),
  highlight: z.string().max(120),
});

const inviteSchema = z.object({
  message: z.string().min(1).max(500),
  rationale: z.string().max(180),
});

const applicationSummarySchema = z.object({
  overview: z.string().max(350),
  applications: z
    .array(
      z.object({
        index: z.number().int().min(0).max(11),
        intent: z.string().max(220),
        clarifyQuestion: z.string().max(180).nullable(),
        caution: z.string().max(180).nullable(),
      })
    )
    .max(12),
});

const writingReturns = v.object({
  suggestions: v.array(v.object({ text: v.string(), angle: v.string() })),
  rationale: v.string(),
  usageEventId: v.id("aiUsageEvents"),
});

function requireShort(value: string | undefined, field: string, max: number) {
  if (value && value.length > max) {
    throw new ConvexError({
      code: "AI_INPUT_TOO_LONG",
      field,
      message: `${field} is too long for AI help.`,
    });
  }
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

async function contextKey(value: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value))
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function dailyBudgetMicros() {
  const configured = Number(process.env.AI_DAILY_BUDGET_USD ?? "5");
  const dollars = Number.isFinite(configured) && configured > 0 ? configured : 5;
  return Math.round(dollars * 1_000_000);
}

async function beginRequest(
  ctx: any,
  userId: any,
  feature: AiFeature,
  cacheValue: unknown
): Promise<{
  key: string;
  cached: any | null;
  usageEventId: Id<"aiUsageEvents"> | null;
}> {
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
  // Cached responses are still requests against our backend, so they consume
  // the same abuse-protection quota even though they cost zero model tokens.
  await ctx.runMutation(internal.aiRateLimits.consume, { userId, feature });

  const key = await contextKey(cacheValue);
  const cached = await ctx.runQuery(internal.aiOperations.getCache, {
    userId,
    feature,
    contextKey: key,
  });
  if (cached) {
    const usageEventId = await ctx.runMutation(internal.aiOperations.recordUsage, {
      userId,
      feature,
      model: MODEL,
      source: "cache",
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    });
    return { key, cached: JSON.parse(cached), usageEventId };
  }

  const spend = await ctx.runQuery(internal.aiOperations.dailySpendMicros, {});
  if (spend >= dailyBudgetMicros()) {
    throw new ConvexError({
      code: "AI_BUDGET_LIMIT",
      message: "AI help has reached today's service budget. Please try again tomorrow.",
    });
  }
  return { key, cached: null, usageEventId: null };
}

async function finishRequest(
  ctx: any,
  userId: any,
  feature: AiFeature,
  key: string,
  value: unknown,
  usage: any,
  ttlMs: number
): Promise<Id<"aiUsageEvents">> {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const cachedInputTokens =
    usage?.cachedInputTokens ?? usage?.inputTokenDetails?.cacheReadTokens ?? 0;
  const usageEventId = await ctx.runMutation(internal.aiOperations.recordUsage, {
    userId,
    feature,
    model: MODEL,
    source: "model",
    inputTokens,
    outputTokens,
    cachedInputTokens,
  });
  await ctx.runMutation(internal.aiOperations.putCache, {
    userId,
    feature,
    contextKey: key,
    value: JSON.stringify(value),
    ttlMs,
  });
  return usageEventId;
}

async function generateStructured(
  ctx: any,
  userId: any,
  prompt: string,
  schema: any,
  maxOutputTokens: number
): Promise<any> {
  return assistant.generateObject(
    ctx,
    { userId: String(userId) },
    {
      prompt,
      schema,
      maxOutputTokens,
      maxRetries: 1,
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
}

function publicGoalContext(goal: any, updates: any[]) {
  return {
    title: goal.title,
    summary: goal.summary ?? null,
    progressType: goal.progressType,
    currentValue: goal.currentValue ?? 0,
    targetValue: goal.targetValue,
    unit: goal.unit,
    direction: goal.direction,
    targetDate: goal.targetDate ?? null,
    milestones: (goal.milestones ?? []).map((milestone: any) => ({
      title: milestone.title,
      done: milestone.done,
    })),
    recentUpdates: updates.map((update) => ({
      type: update.type,
      note: update.note?.slice(0, 600) ?? null,
      value: update.value ?? null,
      createdAt: update.createdAt,
    })),
  };
}

export const loadSupportContext = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals") },
  handler: async (ctx, { userId, goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return null;
    const supporter = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q) => q.eq("goalId", goalId).eq("userId", userId))
      .unique();
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const canSee =
      goal.ownerId === userId ||
      goal.visibility !== "private" ||
      Boolean(supporter) ||
      pledges.some((pledge) => pledge.goalId === goalId);
    if (!canSee || goal.moderationStatus === "rejected") return null;
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", goalId).eq("publicVisible", true)
      )
      .order("desc")
      .take(3);
    return publicGoalContext(goal, updates.filter((update) => !update.revertedAt));
  },
});

export const loadCheckInContext = internalQuery({
  args: { userId: v.id("users"), pledgeId: v.id("motivatorPledges") },
  handler: async (ctx, { userId, pledgeId }) => {
    const pledge = await ctx.db.get(pledgeId);
    if (!pledge || pledge.userId !== userId || pledge.status === "removed") return null;
    const goal = await ctx.db.get(pledge.goalId);
    if (!goal) return null;
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", pledge.goalId).eq("publicVisible", true)
      )
      .order("desc")
      .take(3);
    return {
      ...publicGoalContext(goal, updates.filter((update) => !update.revertedAt)),
      role: pledge.role,
      cadence: pledge.checkInFrequency,
    };
  },
});

export const loadOwnerGoalContext = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals") },
  handler: async (ctx, { userId, goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .take(6);
    return {
      ...publicGoalContext(
        goal,
        updates.filter((update) => !update.revertedAt).slice(0, 3)
      ),
      status: goal.status,
      createdAt: goal.createdAt,
      launchedAt: goal.launchedAt ?? null,
      lastActivityAt:
        updates.find((update) => !update.revertedAt)?.createdAt ??
        goal.launchedAt ??
        goal.createdAt,
    };
  },
});

export const loadApplicationContext = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals") },
  handler: async (ctx, { userId, goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const applications = await ctx.db
      .query("motivatorApplications")
      .withIndex("by_goal_status", (q) => q.eq("goalId", goalId).eq("status", "pending"))
      .take(12);
    return {
      goal: { title: goal.title, summary: goal.summary ?? null },
      applications: await Promise.all(
        applications.map(async (application, index) => {
          const applicant = await ctx.db.get(application.applicantId);
          return {
            index,
            name: applicant?.name?.slice(0, 60) ?? "Applicant",
            requestedRole: application.requestedRole,
            message: application.message.slice(0, 1_000),
          };
        })
      ),
    };
  },
});

export const draftSupport = action({
  args: {
    goalId: v.id("goals"),
    supportType: supportTypeValidator,
    draftText: v.optional(v.string()),
  },
  returns: writingReturns,
  handler: async (ctx, args): Promise<WritingResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    requireShort(args.draftText, "message", 1_000);
    const goal = await ctx.runQuery(internal.aiCoach.loadSupportContext, {
      userId,
      goalId: args.goalId,
    });
    if (!goal) throw new ConvexError("Goal not available for AI help");
    const payload = { goal, supportType: args.supportType, draftText: args.draftText ?? "" };
    const request = await beginRequest(ctx, userId, "supportDraft", payload);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Draft exactly three distinct support messages. Each should sound human and refer only to supplied facts.",
        "Do not pressure, diagnose, promise outcomes, or claim a personal experience that was not supplied.",
        `Context: ${JSON.stringify(payload)}`,
      ].join("\n"),
      writingSuggestionSchema,
      220
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "supportDraft",
      request.key,
      value,
      result.usage,
      15 * 60 * 1000
    );
    return { ...value, usageEventId };
  },
});

export const draftCheckIn = action({
  args: {
    pledgeId: v.id("motivatorPledges"),
    type: v.string(),
    draftText: v.optional(v.string()),
  },
  returns: writingReturns,
  handler: async (ctx, args): Promise<WritingResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    requireShort(args.type, "check-in type", 40);
    requireShort(args.draftText, "message", 1_000);
    const goal = await ctx.runQuery(internal.aiCoach.loadCheckInContext, {
      userId,
      pledgeId: args.pledgeId,
    });
    if (!goal) throw new ConvexError("Check-in not available for AI help");
    const payload = { goal, type: args.type, draftText: args.draftText ?? "" };
    const request = await beginRequest(ctx, userId, "checkInDraft", payload);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Draft exactly three concise check-in messages for this motivator.",
        "Make each option supportive and specific without policing, shaming, or inventing familiarity.",
        `Context: ${JSON.stringify(payload)}`,
      ].join("\n"),
      writingSuggestionSchema,
      220
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "checkInDraft",
      request.key,
      value,
      result.usage,
      15 * 60 * 1000
    );
    return { ...value, usageEventId };
  },
});

export const suggestNextAction = action({
  args: { goalId: v.id("goals") },
  returns: v.object({
    headline: v.string(),
    action: v.string(),
    reason: v.string(),
    updatePrompt: v.string(),
    usageEventId: v.id("aiUsageEvents"),
  }),
  handler: async (ctx, { goalId }): Promise<NextActionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    const goal = await ctx.runQuery(internal.aiCoach.loadOwnerGoalContext, { userId, goalId });
    if (!goal) throw new ConvexError("Goal not available for AI help");
    const request = await beginRequest(ctx, userId, "nextAction", goal);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Recommend one small action the owner can complete next. Prefer the first incomplete milestone or a measurable update.",
        "Do not change targets or deadlines. The updatePrompt should help the user report the result afterward.",
        `Goal context: ${JSON.stringify(goal)}`,
      ].join("\n"),
      nextActionSchema,
      240
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "nextAction",
      request.key,
      value,
      result.usage,
      6 * 60 * 60 * 1000
    );
    return { ...value, usageEventId };
  },
});

export const createRecoveryPlan = action({
  args: { goalId: v.id("goals"), blocker: recoveryBlockerValidator },
  returns: v.object({
    headline: v.string(),
    steps: v.array(v.string()),
    adjustment: v.union(v.string(), v.null()),
    encouragement: v.string(),
    usageEventId: v.id("aiUsageEvents"),
  }),
  handler: async (ctx, { goalId, blocker }): Promise<RecoveryResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    const goal = await ctx.runQuery(internal.aiCoach.loadOwnerGoalContext, { userId, goalId });
    if (!goal) throw new ConvexError("Goal not available for AI help");
    const payload = { goal, blocker };
    const request = await beginRequest(ctx, userId, "recoveryPlan", payload);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Create a gentle restart plan with one to three concrete steps sized for the stated blocker.",
        "You may suggest an optional adjustment, but never change stored goal data or give medical, legal, or financial advice.",
        `Context: ${JSON.stringify(payload)}`,
      ].join("\n"),
      recoverySchema,
      400
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "recoveryPlan",
      request.key,
      value,
      result.usage,
      DAY
    );
    return { ...value, usageEventId };
  },
});

export const createWeeklyRecap = action({
  args: { tzOffsetMinutes: v.optional(v.number()) },
  returns: v.object({
    narrative: v.string(),
    reflectionQuestion: v.string(),
    highlight: v.string(),
    usageEventId: v.id("aiUsageEvents"),
  }),
  handler: async (ctx, args): Promise<RecapResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    const summary = await ctx.runQuery(api.insights.weeklySummary, args);
    if (!summary) throw new ConvexError("Weekly recap is not available");
    const request = await beginRequest(ctx, userId, "weeklyRecap", summary);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Turn these verified weekly statistics into a two-sentence reflection and one useful question.",
        "Do not recalculate, exaggerate, shame a quiet week, or invent causes. The highlight must be grounded in a supplied statistic.",
        `Verified statistics: ${JSON.stringify(summary)}`,
      ].join("\n"),
      recapSchema,
      300
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "weeklyRecap",
      request.key,
      value,
      result.usage,
      8 * DAY
    );
    return { ...value, usageEventId };
  },
});

export const draftInvite = action({
  args: {
    goalId: v.id("goals"),
    name: v.string(),
    role: roleValidator,
    frequency: frequencyValidator,
    draftText: v.optional(v.string()),
  },
  returns: v.object({
    message: v.string(),
    rationale: v.string(),
    usageEventId: v.id("aiUsageEvents"),
  }),
  handler: async (ctx, args): Promise<InviteResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    requireShort(args.name, "name", 60);
    requireShort(args.draftText, "message", 500);
    const goal = await ctx.runQuery(internal.aiCoach.loadOwnerGoalContext, {
      userId,
      goalId: args.goalId,
    });
    if (!goal) throw new ConvexError("Goal not available for AI help");
    const payload = {
      goal: { title: goal.title, summary: goal.summary },
      name: args.name,
      role: args.role,
      frequency: args.frequency,
      draftText: args.draftText ?? "",
    };
    const request = await beginRequest(ctx, userId, "inviteDraft", payload);
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Draft a personal invitation from the goal owner to the named person.",
        "Explain the requested role and cadence naturally. Do not imply obligation, guilt, or a relationship detail that was not supplied.",
        `Context: ${JSON.stringify(payload)}`,
      ].join("\n"),
      inviteSchema,
      180
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "inviteDraft",
      request.key,
      value,
      result.usage,
      DAY
    );
    return { ...value, usageEventId };
  },
});

export const summarizeApplications = action({
  args: { goalId: v.id("goals") },
  returns: v.object({
    overview: v.string(),
    applications: v.array(
      v.object({
        index: v.number(),
        intent: v.string(),
        clarifyQuestion: v.union(v.string(), v.null()),
        caution: v.union(v.string(), v.null()),
      })
    ),
    usageEventId: v.id("aiUsageEvents"),
  }),
  handler: async (ctx, { goalId }): Promise<ApplicationSummaryResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to use AI help");
    const applications = await ctx.runQuery(internal.aiCoach.loadApplicationContext, {
      userId,
      goalId,
    });
    if (!applications || applications.applications.length === 0) {
      throw new ConvexError("There are no pending applications to summarize");
    }
    const request = await beginRequest(
      ctx,
      userId,
      "applicationSummary",
      applications
    );
    if (request.cached) return { ...request.cached, usageEventId: request.usageEventId };
    const result = await generateStructured(
      ctx,
      userId,
      [
        "Summarize each applicant's stated intent and identify only missing information or unclear boundaries.",
        "Preserve the input index exactly. Do not rank, recommend, approve, decline, infer protected traits, or make personality judgments.",
        "A caution may flag ambiguity or a stated scheduling mismatch only; otherwise return null.",
        `Applications: ${JSON.stringify(applications)}`,
      ].join("\n"),
      applicationSummarySchema,
      520
    );
    const value = result.object;
    const usageEventId = await finishRequest(
      ctx,
      userId,
      "applicationSummary",
      request.key,
      value,
      result.usage,
      2 * 60 * 60 * 1000
    );
    return { ...value, usageEventId };
  },
});
