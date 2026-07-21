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

    // --- Motivation Circle fields ---
    /**
     * How the creator wants to handle public motivator applications.
     *  - "auto": join instantly, no approval needed.
     *  - "approval": creator must approve each application.
     *  - "disabled": public users cannot apply (core circle only).
     */
    publicMotivatorPolicy: v.union(
      v.literal("auto"),
      v.literal("approval"),
      v.literal("disabled")
    ),
    /** Minimum number of core motivators required before the creator can launch early. */
    coreMotivatorMin: v.number(),
    /** When the pre-launch window started (set when invites are sent). */
    preLaunchAt: v.optional(v.number()),
    /** When the pre-launch window expires (auto-launch nudge). */
    preLaunchDeadline: v.optional(v.number()),
    /** When the goal was promoted from pre-launch / draft to active. */
    launchedAt: v.optional(v.number()),
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

  /**
   * Motivation Circle — the creator's pre-launch team.
   * The creator sends up to six of these. Each invitee accepts, declines, or
   * asks a question. On accept, a motivatorPledge is created.
   */
  motivatorInvites: defineTable({
    goalId: v.id("goals"),
    creatorId: v.id("users"),
    /** Display name entered by the creator. */
    name: v.string(),
    /** Email the creator typed — used to auto-link if the user already has an account. */
    email: v.optional(v.string()),
    /** Set once the email matches a registered user. */
    invitedUserId: v.optional(v.id("users")),
    /** What the creator wants this person to do. */
    proposedRole: v.union(
      v.literal("encourager"),
      v.literal("accountability"),
      v.literal("advice"),
      v.literal("review"),
      v.literal("challenge")
    ),
    /** How often the creator expects check-ins. */
    proposedFrequency: v.union(
      v.literal("afterUpdate"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("onRequest")
    ),
    /** Optional personal note from the creator. */
    personalMessage: v.optional(v.string()),
    /** One-time token used in the shareable invite link. */
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    /** Set when the invitee accepts — links to the resulting pledge. */
    pledgeId: v.optional(v.id("motivatorPledges")),
    /** Denormalized goal title for display on the invite page without a join. */
    goalTitle: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_status", ["goalId", "status"])
    .index("by_creator", ["creatorId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  /**
   * Motivation Circle — the actual pledge.
   * Created when an invitee accepts (core) or a public application is approved.
   * This is the committed tier; the legacy `supporters` table stays as the casual tier.
   */
  motivatorPledges: defineTable({
    goalId: v.id("goals"),
    /** User who is the motivator. */
    userId: v.id("users"),
    /** The role they signed up for. */
    role: v.union(
      v.literal("encourager"),
      v.literal("accountability"),
      v.literal("advice"),
      v.literal("review"),
      v.literal("challenge")
    ),
    /**
     * How often they intend to check in. They can change this from their
     * motivator dashboard.
     */
    checkInFrequency: v.union(
      v.literal("afterUpdate"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("onRequest")
    ),
    /** Public, plain-language commitment the motivator is making. */
    pledgeText: v.optional(v.string()),
    /** How they want to be notified when the creator posts an update. */
    notificationPref: v.union(
      v.literal("immediate"),
      v.literal("dailyDigest"),
      v.literal("weeklyDigest"),
      v.literal("onRequest")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("removed")
    ),
    /** True for the original six invited circle members. False for public motivators. */
    isCoreMotivator: v.boolean(),
    acceptedAt: v.number(),
    lastCheckInAt: v.optional(v.number()),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_status", ["goalId", "status"])
    .index("by_goal_role", ["goalId", "role"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  /**
   * Public motivator applications.
   * Public users who want to join a goal's circle fill one of these. The
   * creator approves or declines from the dashboard.
   */
  motivatorApplications: defineTable({
    goalId: v.id("goals"),
    applicantId: v.id("users"),
    requestedRole: v.union(
      v.literal("encourager"),
      v.literal("accountability"),
      v.literal("advice"),
      v.literal("review"),
      v.literal("challenge")
    ),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    /** Set when accepted — links to the resulting pledge. */
    pledgeId: v.optional(v.id("motivatorPledges")),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_status", ["goalId", "status"])
    .index("by_applicant", ["applicantId"]),

  /**
   * Motivator check-ins. Structured messages a motivator sends in response
   * to a creator update, or proactively on their scheduled cadence.
   * Separate from supportMessages (anonymous public cheer).
   */
  checkIns: defineTable({
    goalId: v.id("goals"),
    /** The motivator sending the check-in. */
    motivatorId: v.id("users"),
    /** The goal's creator. */
    creatorId: v.id("users"),
    /** What kind of check-in this is. */
    type: v.union(
      v.literal("encouragement"),
      v.literal("accountability"),
      v.literal("advice"),
      v.literal("reflection"),
      v.literal("milestone")
    ),
    /** Optional reference to the update that prompted this check-in. */
    updateId: v.optional(v.id("updates")),
    body: v.string(),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"])
    .index("by_motivator", ["motivatorId"])
    .index("by_motivator_created", ["motivatorId", "createdAt"])
    .index("by_creator", ["creatorId"]),
});
