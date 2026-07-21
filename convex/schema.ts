// @ts-nocheck — see convex/goals.ts header.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * myodyssey schema.
 *
 * Tables:
 *  - users / sessions / accounts / verificationCodes: from @convex-dev/auth
 *  - goals: a single goal owned by a user, with a public slug
 *  - updates: a progress entry on a goal (note, image, link, or value)
 *  - reactions: public reactions left by visitors (emoji or message)
 *  - badges: milestone badges earned on a goal
 */
export default defineSchema({
  ...authTables,

  goals: defineTable({
    ownerId: v.id("users"),
    /** Denormalized owner profile for fast public reads. */
    ownerName: v.optional(v.string()),
    ownerImage: v.optional(v.string()),
    title: v.string(),
    /** Rich long-form story, shown on the public hero. */
    story: v.optional(v.string()),
    category: v.string(), // "weight" | "fitness" | "learning" | "habit" | "creative" | "business" | "custom"
    unit: v.string(),
    startValue: v.number(),
    targetValue: v.number(),
    currentValue: v.number(),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    targetDate: v.number(),
    slug: v.string(),
    publicEnabled: v.boolean(),
    coverImageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_public_created", ["publicEnabled", "createdAt"]),

  updates: defineTable({
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    type: v.union(v.literal("note"), v.literal("image"), v.literal("link"), v.literal("value")),
    value: v.optional(v.number()),
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    publicVisible: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"]),

  reactions: defineTable({
    goalId: v.id("goals"),
    kind: v.union(v.literal("emoji"), v.literal("message")),
    /** One of the four cheer types when kind === "emoji". */
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

  badges: defineTable({
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    tier: v.union(v.literal(25), v.literal(50), v.literal(75), v.literal(100)),
    awardedAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_tier", ["goalId", "tier"]),
});
