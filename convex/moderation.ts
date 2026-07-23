/**
 * Internal moderation pipeline for user-generated progress updates.
 *
 * New updates are held private while this action checks their caption and
 * stored images. An unavailable provider deliberately sends content to the
 * manual queue rather than publishing it without a review decision.
 */
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const decisionValidator = v.union(
  v.literal("approved"),
  v.literal("review"),
  v.literal("rejected")
);

const hardBlockCategories = new Set([
  "sexual/minors",
  "harassment/threatening",
  "hate/threatening",
  "illicit/violent",
]);

/**
 * Safe operational check for the moderation provider. It deliberately sends
 * only fixed harmless text and never returns the configured secret or an
 * upstream response body.
 */
export const verifyProvider = internalAction({
  args: {},
  handler: async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { configured: false, reachable: false, reason: "missing_api_key" as const };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: [{ type: "text", text: "A harmless moderation connectivity check." }],
        }),
      });

      if (!response.ok) {
        return { configured: true, reachable: false, status: response.status };
      }

      const payload = (await response.json()) as {
        results?: Array<{ flagged?: boolean }>;
      };
      return {
        configured: true,
        reachable: true,
        flagged: Boolean(payload.results?.[0]?.flagged),
      };
    } catch {
      return { configured: true, reachable: false, reason: "request_failed" as const };
    }
  },
});

/** Smallest payload needed by the external review action. */
export const getUpdateForReview = internalQuery({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => ctx.db.get(updateId),
});

/** Atomically apply an automated or manual decision. */
export const applyUpdateDecision = internalMutation({
  args: {
    updateId: v.id("updates"),
    decision: decisionValidator,
    reason: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { updateId, decision, reason, categories }) => {
    const update = await ctx.db.get(updateId);
    if (!update || update.moderationStatus === "rejected") return;
    await ctx.db.patch(updateId, {
      moderationStatus: decision,
      moderationReason: reason,
      moderationCategories: categories,
      moderatedAt: Date.now(),
      publicVisible: decision === "approved",
    });

    // Fan out "new update" emails to followers when an update is approved.
    if (decision === "approved") {
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfUpdate, {
        goalId: update.goalId,
        ownerId: update.ownerId,
        updateId,
      });
    }
  },
});

/** Review queue for operations staff, callable through the Convex CLI. */
export const listUpdateQueue = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = Math.min(Math.max(limit ?? 50, 1), 100);
    const [review, pending] = await Promise.all([
      ctx.db
        .query("updates")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "review"))
        .order("desc")
        .take(take),
      ctx.db
        .query("updates")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "pending"))
        .order("desc")
        .take(take),
    ]);
    return [...review, ...pending]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take);
  },
});

/** Manual final decision for a queued update. */
export const decideUpdate = internalMutation({
  args: {
    updateId: v.id("updates"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { updateId, decision, note }) => {
    const update = await ctx.db.get(updateId);
    if (!update) throw new Error("Update not found");
    await ctx.db.patch(updateId, {
      moderationStatus: decision,
      moderationReason: note?.trim() || (decision === "approved" ? "Approved by moderator" : "Removed by moderator"),
      moderatedAt: Date.now(),
      publicVisible: decision === "approved",
    });

    // Fan out "new update" emails to followers when manually approved.
    if (decision === "approved") {
      await ctx.scheduler.runAfter(0, internal.goals.notifyFollowersOfUpdate, {
        goalId: update.goalId,
        ownerId: update.ownerId,
        updateId,
      });
    }
  },
});

/**
 * Call OpenAI's moderation endpoint with update text and first-party images.
 * Public social-video links are URL-validated at creation time; their remote
 * video is not fetched here and remains reportable in the app.
 */
export const reviewUpdate = internalAction({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const update = await ctx.runQuery(internal.moderation.getUpdateForReview, { updateId });
    if (!update || update.moderationStatus !== "pending") return { status: "skipped" as const };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.moderation.applyUpdateDecision, {
        updateId,
        decision: "review",
        reason: "Automated moderation is not configured",
        categories: ["configuration"],
      });
      return { status: "review" as const, reason: "missing_api_key" };
    }

    const text = [update.note, update.linkTitle, update.linkUrl]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n");
    const imageIds = [
      update.imageId,
      ...(update.media ?? [])
        .filter((item) => item.kind === "image")
        .map((item) => item.storageId),
    ].filter(Boolean);

    const input: Array<Record<string, unknown>> = [];
    if (text) input.push({ type: "text", text });
    for (const imageId of imageIds) {
      const url = await ctx.storage.getUrl(imageId!);
      if (url) input.push({ type: "image_url", image_url: { url } });
    }

    // Value-only updates have no untrusted text/media and can be published.
    if (input.length === 0) {
      await ctx.runMutation(internal.moderation.applyUpdateDecision, {
        updateId,
        decision: "approved",
        reason: "No reviewable media",
      });
      return { status: "approved" as const };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: "omni-moderation-latest", input }),
      });
      if (!response.ok) {
        throw new Error(`Moderation provider returned ${response.status}`);
      }
      const payload = (await response.json()) as {
        results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
      };
      const result = payload.results?.[0];
      if (!result) throw new Error("Moderation provider returned no result");

      const categories = Object.entries(result.categories ?? {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      const hardBlock = categories.find((category) => hardBlockCategories.has(category));
      const decision = hardBlock ? "rejected" : result.flagged ? "review" : "approved";
      await ctx.runMutation(internal.moderation.applyUpdateDecision, {
        updateId,
        decision,
        reason: hardBlock
          ? "Automatically removed for a severe safety violation"
          : result.flagged
            ? "Requires human review"
            : "Automatically approved",
        categories,
      });
      return { status: decision, categories };
    } catch (error) {
      await ctx.runMutation(internal.moderation.applyUpdateDecision, {
        updateId,
        decision: "review",
        reason: "Automated moderation could not be completed",
        categories: ["provider_error"],
      });
      console.error("[moderation] review failed", error);
      return { status: "review" as const, reason: "provider_error" };
    }
  },
});

/** Goal copy and cover images use the same pending → decision workflow. */
export const getGoalForReview = internalQuery({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => ctx.db.get(goalId),
});

export const applyGoalDecision = internalMutation({
  args: {
    goalId: v.id("goals"),
    decision: decisionValidator,
    reason: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { goalId, decision, reason, categories }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.moderationStatus === "rejected") return;
    await ctx.db.patch(goalId, {
      moderationStatus: decision,
      moderationReason: reason,
      moderationCategories: categories,
      moderatedAt: Date.now(),
    });
  },
});

export const reviewGoal = internalAction({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const goal = await ctx.runQuery(internal.moderation.getGoalForReview, { goalId });
    if (!goal || goal.moderationStatus !== "pending") return { status: "skipped" as const };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.moderation.applyGoalDecision, {
        goalId,
        decision: "review",
        reason: "Automated moderation is not configured",
        categories: ["configuration"],
      });
      return { status: "review" as const, reason: "missing_api_key" };
    }

    const input: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: [goal.title, goal.summary, goal.story].filter(Boolean).join("\n"),
      },
    ];
    if (goal.coverImageId) {
      const imageUrl = await ctx.storage.getUrl(goal.coverImageId);
      if (imageUrl) input.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: "omni-moderation-latest", input }),
      });
      if (!response.ok) throw new Error(`Moderation provider returned ${response.status}`);
      const payload = (await response.json()) as {
        results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
      };
      const result = payload.results?.[0];
      if (!result) throw new Error("Moderation provider returned no result");
      const categories = Object.entries(result.categories ?? {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      const hardBlock = categories.find((category) => hardBlockCategories.has(category));
      const decision = hardBlock ? "rejected" : result.flagged ? "review" : "approved";
      await ctx.runMutation(internal.moderation.applyGoalDecision, {
        goalId,
        decision,
        reason: hardBlock
          ? "Automatically removed for a severe safety violation"
          : result.flagged
            ? "Requires human review"
            : "Automatically approved",
        categories,
      });
      return { status: decision, categories };
    } catch (error) {
      await ctx.runMutation(internal.moderation.applyGoalDecision, {
        goalId,
        decision: "review",
        reason: "Automated moderation could not be completed",
        categories: ["provider_error"],
      });
      console.error("[moderation] goal review failed", error);
      return { status: "review" as const, reason: "provider_error" };
    }
  },
});

export const listGoalQueue = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = Math.min(Math.max(limit ?? 50, 1), 100);
    const [review, pending] = await Promise.all([
      ctx.db
        .query("goals")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "review"))
        .order("desc")
        .take(take),
      ctx.db
        .query("goals")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "pending"))
        .order("desc")
        .take(take),
    ]);
    return [...review, ...pending].sort((a, b) => b.createdAt - a.createdAt).slice(0, take);
  },
});

export const decideGoal = internalMutation({
  args: {
    goalId: v.id("goals"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, decision, note }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");
    await ctx.db.patch(goalId, {
      moderationStatus: decision,
      moderationReason: note?.trim() || (decision === "approved" ? "Approved by moderator" : "Removed by moderator"),
      moderatedAt: Date.now(),
    });
  },
});

/** Supporter messages are text-only but follow the same safe-default flow. */
export const getSupportMessageForReview = internalQuery({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, { messageId }) => ctx.db.get(messageId),
});

export const applySupportMessageDecision = internalMutation({
  args: {
    messageId: v.id("supportMessages"),
    decision: decisionValidator,
    reason: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { messageId, decision, reason, categories }) => {
    const message = await ctx.db.get(messageId);
    if (!message || message.moderationStatus === "rejected") return;
    await ctx.db.patch(messageId, {
      moderationStatus: decision,
      moderationReason: reason,
      moderationCategories: categories,
      moderatedAt: Date.now(),
      hiddenAt: decision === "rejected" ? Date.now() : undefined,
    });
  },
});

export const reviewSupportMessage = internalAction({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.runQuery(internal.moderation.getSupportMessageForReview, { messageId });
    if (!message || message.moderationStatus !== "pending") return { status: "skipped" as const };
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.moderation.applySupportMessageDecision, {
        messageId,
        decision: "review",
        reason: "Automated moderation is not configured",
        categories: ["configuration"],
      });
      return { status: "review" as const, reason: "missing_api_key" };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: [{ type: "text", text: message.body }],
        }),
      });
      if (!response.ok) throw new Error(`Moderation provider returned ${response.status}`);
      const payload = (await response.json()) as {
        results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
      };
      const result = payload.results?.[0];
      if (!result) throw new Error("Moderation provider returned no result");
      const categories = Object.entries(result.categories ?? {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      const hardBlock = categories.find((category) => hardBlockCategories.has(category));
      const decision = hardBlock ? "rejected" : result.flagged ? "review" : "approved";
      await ctx.runMutation(internal.moderation.applySupportMessageDecision, {
        messageId,
        decision,
        reason: hardBlock
          ? "Automatically removed for a severe safety violation"
          : result.flagged
            ? "Requires human review"
            : "Automatically approved",
        categories,
      });
      return { status: decision, categories };
    } catch (error) {
      await ctx.runMutation(internal.moderation.applySupportMessageDecision, {
        messageId,
        decision: "review",
        reason: "Automated moderation could not be completed",
        categories: ["provider_error"],
      });
      console.error("[moderation] support-message review failed", error);
      return { status: "review" as const, reason: "provider_error" };
    }
  },
});

export const listSupportMessageQueue = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = Math.min(Math.max(limit ?? 50, 1), 100);
    const [review, pending] = await Promise.all([
      ctx.db
        .query("supportMessages")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "review"))
        .order("desc")
        .take(take),
      ctx.db
        .query("supportMessages")
        .withIndex("by_moderation_status_created", (q) => q.eq("moderationStatus", "pending"))
        .order("desc")
        .take(take),
    ]);
    return [...review, ...pending].sort((a, b) => b.createdAt - a.createdAt).slice(0, take);
  },
});

export const decideSupportMessage = internalMutation({
  args: {
    messageId: v.id("supportMessages"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, decision, note }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Support message not found");
    await ctx.db.patch(messageId, {
      moderationStatus: decision,
      moderationReason: note?.trim() || (decision === "approved" ? "Approved by moderator" : "Removed by moderator"),
      moderatedAt: Date.now(),
      hiddenAt: decision === "rejected" ? Date.now() : undefined,
    });
  },
});
