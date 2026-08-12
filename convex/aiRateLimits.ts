import { ConvexError, v } from "convex/values";
import { DAY, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const featureValidator = v.union(
  v.literal("formAssist"),
  v.literal("supportDraft"),
  v.literal("checkInDraft"),
  v.literal("nextAction"),
  v.literal("recoveryPlan"),
  v.literal("weeklyRecap"),
  v.literal("inviteDraft"),
  v.literal("applicationSummary")
);

type AiFeature =
  | "formAssist"
  | "supportDraft"
  | "checkInDraft"
  | "nextAction"
  | "recoveryPlan"
  | "weeklyRecap"
  | "inviteDraft"
  | "applicationSummary";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiAssistantBurst: {
    kind: "fixed window",
    rate: 5,
    period: 5 * MINUTE,
  },
  aiAssistantDaily: {
    kind: "fixed window",
    rate: 30,
    period: DAY,
  },
  aiAssistantGlobal: {
    kind: "fixed window",
    rate: 1_000,
    period: DAY,
  },
  aiFormDaily: { kind: "fixed window", rate: 20, period: DAY },
  aiSupportDaily: { kind: "fixed window", rate: 12, period: DAY },
  aiMomentumDaily: { kind: "fixed window", rate: 8, period: DAY },
  aiRecapDaily: { kind: "fixed window", rate: 3, period: DAY },
  aiInviteDaily: { kind: "fixed window", rate: 8, period: DAY },
  aiApplicationDaily: { kind: "fixed window", rate: 3, period: DAY },
});

function featureBucket(feature: AiFeature) {
  switch (feature) {
    case "formAssist":
      return "aiFormDaily" as const;
    case "supportDraft":
    case "checkInDraft":
      return "aiSupportDaily" as const;
    case "nextAction":
    case "recoveryPlan":
      return "aiMomentumDaily" as const;
    case "weeklyRecap":
      return "aiRecapDaily" as const;
    case "inviteDraft":
      return "aiInviteDaily" as const;
    case "applicationSummary":
      return "aiApplicationDaily" as const;
  }
}

/**
 * Consume every AI quota in one mutation so a rejected request cannot partially
 * consume another limit.
 */
export const consume = internalMutation({
  args: {
    userId: v.id("users"),
    feature: featureValidator,
  },
  returns: v.null(),
  handler: async (ctx, { userId, feature }) => {
    const checks = [
      {
        name: "aiAssistantBurst" as const,
        key: String(userId),
        label: "burst" as const,
      },
      {
        name: "aiAssistantDaily" as const,
        key: String(userId),
        label: "daily" as const,
      },
      {
        name: "aiAssistantGlobal" as const,
        key: undefined,
        label: "service" as const,
      },
      {
        name: featureBucket(feature),
        key: String(userId),
        label: "feature" as const,
      },
    ];

    for (const check of checks) {
      const status = await rateLimiter.limit(ctx, check.name, {
        ...(check.key ? { key: check.key } : {}),
      });
      if (!status.ok) {
        throw new ConvexError({
          code: "AI_RATE_LIMITED",
          limit: check.label,
          retryAfterMs: Math.max(status.retryAfter ?? MINUTE, 1_000),
          message:
            check.label === "service"
              ? "AI help is busy right now. Please try again shortly."
              : check.label === "feature"
              ? "You have reached today's limit for this kind of AI help."
              : "You have reached the AI help limit. Please try again later.",
        });
      }
    }

    return null;
  },
});
