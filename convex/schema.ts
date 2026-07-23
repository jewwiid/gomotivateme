// @ts-nocheck — see convex/goals.ts header.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * gomotivateme schema.
 *
 * Tables:
 *  - users / sessions / accounts / verificationCodes: from @convex-dev/auth
 *    (users extended below with handle/bio/coverImageId for the profile)
 *  - goals: a single motivation campaign owned by a user, public-friendly
 *  - updates: progress updates on a goal (note, image, link, value, milestone)
 *  - reactions: anonymous emoji cheer (one per visitor per goal)
 *  - supporters: structured support team — a user joins a goal with a pledge
 *  - supportMessages: attributed structured messages left by supporters
 *  - badges: milestone badges earned on a goal
 *  - motivators (4 tables): the Motivation Circle
 *  - notificationPrefs: per-user email preferences (CAN-SPAM/GDPR)
 *  - notifications: email send queue + audit log
 */
export default defineSchema({
  ...authTables,
  /**
   * Extend the auth users table with profile fields + a handle index.
   * Re-declaring here so we can add the by_handle index + bio/coverImageId
   * that the public profile page needs. Must mirror the @convex-dev/auth
   * defaults or the codegen will complain.
   */
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Profile extensions
    handle: v.optional(v.string()),
    /**
     * How many more times the user can change their handle after the initial
     * signup set. Set to 1 on first handle set; decremented on each change.
     * undefined / 0 = locked.
     */
    handleChangesRemaining: v.optional(v.number()),
    bio: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    /** Signed token for one-click email unsubscribe links. */
    unsubscribeToken: v.optional(v.string()),
    /** Admin flag — gates access to moderation + admin functions. */
    isAdmin: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_handle", ["handle"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),

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
    startValue: v.optional(v.number()),
    targetValue: v.number(),
    currentValue: v.optional(v.number()),
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
    /** New/edited public goal content waits for a safety decision. */
    moderationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("review"),
        v.literal("rejected")
      )
    ),
    moderationReason: v.optional(v.string()),
    moderationCategories: v.optional(v.array(v.string())),
    moderatedAt: v.optional(v.number()),
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
    /**
     * Last time a "stale goal" reminder email was sent for this goal.
     * Prevents daily re-nagging. Reset when the owner posts an update.
     */
    lastStaleReminderAt: v.optional(v.number()),
    /** Last time a "deadline approaching" email was sent for this goal. */
    lastDeadlineWarningAt: v.optional(v.number()),
    /** True once the "deadline passed" email has been sent. */
    deadlinePassedNotified: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_slug", ["slug"])
    .index("by_handle", ["ownerHandle"])
    .index("by_moderation_status_created", ["moderationStatus", "createdAt"])
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
      v.literal("media"),
      v.literal("link"),
      v.literal("value"),
      v.literal("milestone")
    ),
    /** For type === "value" — measured value. */
    value: v.optional(v.number()),
    /** For type === "milestone" — id of the milestone that flipped to done. */
    milestoneId: v.optional(v.string()),
    note: v.optional(v.string()),
    /**
     * Rich progress media. Images are stored in Convex file storage; public
     * video embeds are normalized server-side so the client never renders an
     * arbitrary iframe URL.
     */
    media: v.optional(
      v.array(
        v.object({
          kind: v.union(v.literal("image"), v.literal("embed")),
          storageId: v.optional(v.id("_storage")),
          /** Smaller responsive variant used for cards and multi-photo grids. */
          thumbnailId: v.optional(v.id("_storage")),
          provider: v.optional(
            v.union(
              v.literal("youtube"),
              v.literal("tiktok"),
              v.literal("instagram")
            )
          ),
          canonicalUrl: v.optional(v.string()),
          embedUrl: v.optional(v.string()),
          providerId: v.optional(v.string()),
          alt: v.optional(v.string()),
        })
      )
    ),
    imageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    /** Visibility is only enabled after automated or manual safety review. */
    moderationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("review"),
        v.literal("rejected")
      )
    ),
    moderationReason: v.optional(v.string()),
    moderationCategories: v.optional(v.array(v.string())),
    moderatedAt: v.optional(v.number()),
    reportCount: v.optional(v.number()),
    publicVisible: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"])
    .index("by_goal_visible_created", ["goalId", "publicVisible", "createdAt"])
    .index("by_goal_milestone_created", ["goalId", "milestoneId", "createdAt"])
    .index("by_moderation_status_created", ["moderationStatus", "createdAt"]),

  /** One-use, owner-bound tokens for direct media uploads. */
  mediaUploadIntents: defineTable({
    token: v.string(),
    ownerId: v.id("users"),
    goalId: v.id("goals"),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_owner", ["ownerId"]),

  /** Public reports feed an internal moderation review queue. */
  reports: defineTable({
    targetType: v.union(v.literal("goal"), v.literal("update")),
    targetKey: v.string(),
    goalId: v.id("goals"),
    updateId: v.optional(v.id("updates")),
    reporterKey: v.string(),
    reason: v.union(
      v.literal("sexual"),
      v.literal("violence"),
      v.literal("harassment"),
      v.literal("hate"),
      v.literal("self_harm"),
      v.literal("spam"),
      v.literal("other")
    ),
    details: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    resolutionNote: v.optional(v.string()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_target_reporter", ["targetKey", "reporterKey"])
    .index("by_goal", ["goalId"]),

  /** Anonymous emoji cheer (replaces the old thumbsUp). One per visitor. */
  reactions: defineTable({
    goalId: v.id("goals"),
    /** Set when reacting to a specific update; undefined for goal-level cheers. */
    updateId: v.optional(v.id("updates")),
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
    .index("by_goal_kind_visitor", ["goalId", "kind", "visitorKey"])
    .index("by_update", ["updateId"])
    .index("by_update_kind_visitor", ["updateId", "kind", "visitorKey"]),

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
    moderationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("review"),
        v.literal("rejected")
      )
    ),
    moderationReason: v.optional(v.string()),
    moderationCategories: v.optional(v.array(v.string())),
    moderatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_created", ["goalId", "createdAt"])
    .index("by_author", ["authorId"])
    .index("by_moderation_status_created", ["moderationStatus", "createdAt"]),

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
    .index("by_invited_user", ["invitedUserId"])
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
    /** Last time the check-in-due reminder email fired (prevents daily spam). */
    lastReminderAt: v.optional(v.number()),
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

  /**
   * Per-user email notification preferences.
   * One row per user (created lazily on first signup / first email enqueued).
   * Drives suppression of lifecycle email per CAN-SPAM / GDPR.
   */
  notificationPrefs: defineTable({
    userId: v.id("users"),
    /** Email snapshot for the unsubscribe page without a join. */
    email: v.optional(v.string()),
    /** Updates on goals you motivate (reactions, replies, milestones). */
    yourMotivations: v.boolean(),
    /** Updates on goals you support (progress posts from the creator). */
    supportedGoalUpdates: v.optional(v.boolean()),
    /** A new motivator joins one of your goals. */
    newMotivatorOnGoal: v.boolean(),
    /** Monday-morning summary of activity across your goals. */
    weeklyDigest: v.boolean(),
    /** Medical / emergency / memorial goals in your area. */
    urgentCauses: v.boolean(),
    /** New features, design changes, occasional surveys. */
    productUpdates: v.boolean(),
    /** Master opt-out — suppresses ALL lifecycle email. Transactional still sends. */
    unsubscribedAll: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_weekly_digest", ["weeklyDigest"]),

  /**
   * Email send queue + audit log.
   * Trigger mutations enqueue rows here (status "pending" or "suppressed").
   * A cron-driven action drains "pending" rows → calls Resend → marks "sent"/"failed".
   */
  notifications: defineTable({
    /** Recipient user id (null only for visitor emails, which are rare). */
    userId: v.optional(v.id("users")),
    /** Recipient email address (denormalized so we can send without a join). */
    toEmail: v.string(),
    /** Which template to render, e.g. "welcome", "newApplication", "inviteReceived". */
    templateId: v.string(),
    /** JSON-encoded template variables. */
    payload: v.string(),
    /** Lifecycle emails can be suppressed by prefs; transactional always sends. */
    category: v.union(v.literal("transactional"), v.literal("lifecycle")),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("suppressed")
    ),
    /** Resend message id (for open/click/bounce tracking). */
    resendId: v.optional(v.string()),
    /** Last error message if status === "failed". */
    error: v.optional(v.string()),
    attempts: v.number(),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_user", ["userId"]),
});
