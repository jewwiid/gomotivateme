// @ts-nocheck — see convex/goals.ts header.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * gomotivateme schema.
 *
 * Tables:
 *  - users / sessions / accounts / verificationCodes: from @convex-dev/auth
 *  - goals: a single motivation campaign owned by a user, public-friendly
 *  - updates: progress updates on a goal (note, image, link, value, milestone)
 *  - reactions: anonymous emoji cheer (one per visitor per goal)
 *  - supporters: structured support team — a user joins a goal with a pledge
 *  - supportMessages: attributed structured messages left by supporters
 *  - badges: milestone badges earned on a goal
 */
export default defineSchema({
  ...authTables,

  goals: defineTable({
    ownerId: v.id("users"),
    /** Denormalized owner profile for fast public reads. */
    ownerName: v.optional(v.string()),
    ownerImage: v.optional(v.string()),
    ownerHandle: v.optional(v.string()),

    title: v.string(),
    /** Long-form story shown on the public hero. */
    story: v.optional(v.string()),
    /** One-sentence pitch for the homepage card. */
    summary: v.optional(v.string()),
    category: v.string(),

    /** "number" | "streak" | "milestones" — drives progress template. */
    progressType: v.union(
      v.literal("number"),
      v.literal("streak"),
      v.literal("milestones")
    ),
    unit: v.string(), // kg, lbs, books, days, etc.
    startValue: v.number(),
    targetValue: v.number(),
    currentValue: v.number(),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    targetDate: v.optional(v.number()),

    /** Milestone checklist (only used when progressType === "milestones"). */
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          done: v.boolean(),
          completedAt: v.optional(v.number()),
        })
      )
    ),

    /** Dual-target: how many supporters the creator wants behind them. */
    supporterTarget: v.optional(v.number()),
    /** Denormalized count, maintained server-side on joinSupport. */
    supporterCount: v.number(),

    /** What kinds of help the creator wants. Free-form chip array. */
    supportTypes: v.array(
      v.union(
        v.literal("encourage"),
        v.literal("experience"),
        v.literal("advice"),
        v.literal("checkin"),
        v.literal("join")
      )
    ),

    /** Lifecycle: draft | active | paused | completed | closed. */
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("closed")
    ),
    pausedReason: v.optional(v.string()),

    /** "public" (indexed) | "unlisted" (link-only). */
    visibility: v.union(v.literal("public"), v.literal("unlisted")),

    slug: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_slug", ["slug"])
    .index("by_handle", ["ownerHandle"])
    .index("by_public_created", ["visibility", "status", "createdAt"])
    .index("by_category_status", ["category", "status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "category", "visibility"],
    }),

  updates: defineTable({
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    type: v.union(
      v.literal("note"),
      v.literal("image"),
      v.literal("link"),
      v.literal("value"),
      v.literal("milestone")
    ),
    /** For type === "value" — measured value. */
    value: v.optional(v.number()),
    /** For type === "milestone" — id of the milestone that flipped to done. */
    milestoneId: v.optional(v.string()),
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    publicVisible: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"]),

  /** Anonymous emoji cheer (replaces the old thumbsUp). One per visitor. */
  reactions: defineTable({
    goalId: v.id("goals"),
    kind: v.union(v.literal("emoji"), v.literal("message")),
    emoji: v.optional(
      v.union(
        v.literal("thumbsup"),
        v.literal("muscle"),
        v.literal("heart"),
        v.literal("fire")
      )
    ),
    visitorKey: v.string(),
    displayName: v.optional(v.string()),
    message: v.optional(v.string()),
    approved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_kind", ["goalId", "kind"])
    .index("by_goal_kind_visitor", ["goalId", "kind", "visitorKey"]),

  /**
   * Structured support: a user joins a goal with a pledge.
   * One row per (goal, user). The user has decided to be on the support team.
   */
  supporters: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    /** Which kind of support the user is offering. */
    supportType: v.union(
      v.literal("encourage"),
      v.literal("experience"),
      v.literal("advice"),
      v.literal("checkin"),
      v.literal("join")
    ),
    /** Optional non-financial commitment ("I'll check in every Sunday"). */
    pledge: v.optional(v.string()),
    /** Optional cadence for "check in" supporters. */
    checkInFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("justThisOne")
      )
    ),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_user", ["goalId", "userId"])
    .index("by_user", ["userId"]),

  /**
   * Structured support message: an attributed message from a supporter.
   * Different from the anonymous emoji `reactions` table — these are
   * "I want to be part of your support team" messages.
   */
  supportMessages: defineTable({
    goalId: v.id("goals"),
    authorId: v.id("users"),
    supportType: v.union(
      v.literal("encourage"),
      v.literal("experience"),
      v.literal("advice"),
      v.literal("checkin"),
      v.literal("join")
    ),
    body: v.string(),
    /** Soft-delete for moderation. */
    hiddenAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"]),

  badges: defineTable({
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    tier: v.union(v.literal(25), v.literal(50), v.literal(75), v.literal(100)),
    awardedAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_tier", ["goalId", "tier"]),
});
