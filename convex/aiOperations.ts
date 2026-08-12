import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

export const aiFeatureValidator = v.union(
  v.literal("formAssist"),
  v.literal("supportDraft"),
  v.literal("checkInDraft"),
  v.literal("nextAction"),
  v.literal("recoveryPlan"),
  v.literal("weeklyRecap"),
  v.literal("inviteDraft"),
  v.literal("applicationSummary")
);

const cachedFeatureValidator = v.union(
  v.literal("supportDraft"),
  v.literal("checkInDraft"),
  v.literal("nextAction"),
  v.literal("recoveryPlan"),
  v.literal("weeklyRecap"),
  v.literal("inviteDraft"),
  v.literal("applicationSummary")
);

/** Current GPT-5.6 Luna prices expressed in micro-dollars per token. */
function estimateLunaCostMicros(
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number
) {
  const cached = Math.max(0, Math.min(inputTokens, cachedInputTokens));
  const uncached = Math.max(0, inputTokens - cached);
  return Math.max(0, Math.round(uncached * 0.2 + cached * 0.02 + outputTokens * 1.2));
}

export const recordUsage = internalMutation({
  args: {
    userId: v.id("users"),
    feature: aiFeatureValidator,
    model: v.string(),
    source: v.union(v.literal("model"), v.literal("cache")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedInputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("aiUsageEvents", {
      ...args,
      estimatedCostMicros:
        args.source === "cache"
          ? 0
          : estimateLunaCostMicros(
              args.inputTokens,
              args.outputTokens,
              args.cachedInputTokens
            ),
      createdAt: Date.now(),
    });
  },
});

export const recordOutcome = mutation({
  args: {
    usageEventId: v.id("aiUsageEvents"),
    outcome: v.union(
      v.literal("applied"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("dismissed")
    ),
  },
  handler: async (ctx, { usageEventId, outcome }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to record AI feedback");
    const event = await ctx.db.get(usageEventId);
    if (!event || event.userId !== userId) throw new ConvexError("AI event not found");
    await ctx.db.patch(usageEventId, { outcome, outcomeAt: Date.now() });
    return null;
  },
});

export const dailySpendMicros = internalQuery({
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("aiUsageEvents")
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .collect();
    return events.reduce((sum, event) => sum + event.estimatedCostMicros, 0);
  },
});

export const getCache = internalQuery({
  args: {
    userId: v.id("users"),
    feature: cachedFeatureValidator,
    contextKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_user_feature_key", (q) =>
        q
          .eq("userId", args.userId)
          .eq("feature", args.feature)
          .eq("contextKey", args.contextKey)
      )
      .unique();
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.value;
  },
});

export const putCache = internalMutation({
  args: {
    userId: v.id("users"),
    feature: cachedFeatureValidator,
    contextKey: v.string(),
    value: v.string(),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_user_feature_key", (q) =>
        q
          .eq("userId", args.userId)
          .eq("feature", args.feature)
          .eq("contextKey", args.contextKey)
      )
      .unique();
    const value = {
      value: args.value,
      updatedAt: now,
      expiresAt: now + Math.max(60_000, args.ttlMs),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return ctx.db.insert("aiSuggestionCache", {
      userId: args.userId,
      feature: args.feature,
      contextKey: args.contextKey,
      createdAt: now,
      ...value,
    });
  },
});
