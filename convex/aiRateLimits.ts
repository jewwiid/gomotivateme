import { ConvexError, v } from "convex/values";
import { DAY, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

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
});

/**
 * Consume every AI quota in one mutation so a rejected request cannot partially
 * consume another limit.
 */
export const consume = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
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
              : "You have reached the AI help limit. Please try again later.",
        });
      }
    }

    return null;
  },
});
