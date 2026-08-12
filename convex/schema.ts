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
    /**
     * The user's own uploaded avatar.
     *
     * Deliberately NOT stored in `image`: @convex-dev/auth patches the user
     * document with the whole OAuth profile on *every* sign-in, so anything
     * written to `image` is overwritten by the Google picture the next time
     * the user signs in with Google. `image` stays the OAuth-owned field;
     * this one is ours, and read paths prefer it. See resolveAvatarUrl.
     */
    avatarId: v.optional(v.id("_storage")),
    coverImageId: v.optional(v.id("_storage")),
    /** Signed token for one-click email unsubscribe links. */
    unsubscribeToken: v.optional(v.string()),
    /** Admin flag — gates access to moderation + admin functions. */
    isAdmin: v.optional(v.boolean()),
    /** Who can follow this user: "approval" (default) or "open" (auto-accept). */
    followPolicy: v.optional(v.union(v.literal("approval"), v.literal("open"))),
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
    /** Semantic metric selected from the versioned category measurement catalog. */
    metricId: v.optional(v.string()),
    measurementVersion: v.optional(v.number()),
    unit: v.string(), // kg, lbs, books, days, etc.
    startValue: v.optional(v.number()),
    targetValue: v.number(),
    currentValue: v.optional(v.number()),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    targetDate: v.optional(v.number()),

    /**
     * Daily-streak state is stored as the owner's local YYYY-MM-DD key so a
     * streak follows calendar days instead of an approximate 24/48h window.
     */
    streakLastLoggedDay: v.optional(v.string()),
    streakBest: v.optional(v.number()),
    /** Browser `Date#getTimezoneOffset()` value (minutes behind UTC). */
    streakTimezoneOffsetMinutes: v.optional(v.number()),
    /** Local hour (0-23) at which an unlogged streak gets a reminder. */
    streakReminderHour: v.optional(v.number()),
    /** Local day key of the most recently enqueued reminder. */
    streakLastReminderDay: v.optional(v.string()),

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
    visibility: v.union(v.literal("public"), v.literal("unlisted"), v.literal("private")),

    /**
     * When true, the owner's name / avatar / handle are stripped from all
     * public-facing surfaces (discovery feed, goal page, search, OG image).
     * The real denormalized fields stay in the DB for dashboard + email use;
     * public queries replace them with "Anonymous" at read time.
     */
    isAnonymous: v.optional(v.boolean()),

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
    /** Cooldown timestamp for reaction emails — at most 1 per goal per hour. */
    lastReactionEmailAt: v.optional(v.number()),
    /** Last time a "deadline approaching" email was sent for this goal. */
    lastDeadlineWarningAt: v.optional(v.number()),
    /** True once the "deadline passed" email has been sent. */
    deadlinePassedNotified: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_created", ["ownerId", "createdAt"])
    // `by_slug` is kept for backward-compat redirects of old /o/[slug] URLs
    // during the migration to namespaced /o/[handle]/[slug] URLs.
    .index("by_slug", ["slug"])
    // `by_handle_slug` serves both (ownerHandle, slug) lookups (namespaced
    // goal pages) and ownerHandle-only prefix scans (all goals by a user),
    // so there is no separate `by_handle` index.
    .index("by_handle_slug", ["ownerHandle", "slug"])
    .index("by_moderation_status_created", ["moderationStatus", "createdAt"])
    .index("by_public_created", ["visibility", "status", "createdAt"])
    /**
     * Recency feed. `by_public_created` cannot serve this: it lists `status`
     * before `createdAt`, so a query that pins only `visibility` comes back
     * sorted by status first (descending: paused, draft, completed, closed,
     * active) and only then by date — which buries active goals at the end.
     * This index pins visibility and sorts purely by date.
     */
    .index("by_visibility_created", ["visibility", "createdAt"])
    .index("by_category_status", ["category", "status"])
    .index("by_category_created", ["category", "createdAt"])
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
    /** OG preview image stored in Convex file storage (downloaded, not hotlinked). */
    linkImage: v.optional(v.id("_storage")),
    /** OG description or first paragraph text from the linked page. */
    linkDescription: v.optional(v.string()),
    /** OG site name (e.g. "GitHub", "YouTube"). */
    linkSiteName: v.optional(v.string()),
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
    /** Set when this update was undone/reverted. Keeps the audit trail. */
    revertedAt: v.optional(v.number()),
    revertReason: v.optional(v.string()),
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
    .index("by_visitor_created", ["visitorKey", "createdAt"])
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

  /** Named accomplishments, separate from percentage-based progress badges. */
  achievements: defineTable({
    goalId: v.id("goals"),
    ownerId: v.id("users"),
    /** Stable idempotency key, e.g. `streak-7`. */
    key: v.string(),
    kind: v.union(v.literal("streak"), v.literal("consistency")),
    title: v.string(),
    description: v.string(),
    value: v.number(),
    awardedAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_key", ["goalId", "key"])
    .index("by_owner_awarded", ["ownerId", "awardedAt"]),

  /**
   * Per-request AI usage ledger. No prompts or generated copy are stored here:
   * only the feature, token counts, estimated cost, and whether the user used
   * the draft. This keeps cost reporting useful without retaining goal text.
   */
  aiUsageEvents: defineTable({
    userId: v.id("users"),
    feature: v.union(
      v.literal("formAssist"),
      v.literal("supportDraft"),
      v.literal("checkInDraft"),
      v.literal("nextAction"),
      v.literal("recoveryPlan"),
      v.literal("weeklyRecap"),
      v.literal("inviteDraft"),
      v.literal("applicationSummary")
    ),
    model: v.string(),
    source: v.union(v.literal("model"), v.literal("cache")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedInputTokens: v.number(),
    /** Estimated spend in millionths of a US dollar. */
    estimatedCostMicros: v.number(),
    outcome: v.optional(
      v.union(
        v.literal("applied"),
        v.literal("sent"),
        v.literal("viewed"),
        v.literal("dismissed")
      )
    ),
    createdAt: v.number(),
    outcomeAt: v.optional(v.number()),
  })
    .index("by_created", ["createdAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_feature_created", ["userId", "feature", "createdAt"]),

  /** Short-lived, user-scoped cache for identical AI requests. */
  aiSuggestionCache: defineTable({
    userId: v.id("users"),
    feature: v.union(
      v.literal("supportDraft"),
      v.literal("checkInDraft"),
      v.literal("nextAction"),
      v.literal("recoveryPlan"),
      v.literal("weeklyRecap"),
      v.literal("inviteDraft"),
      v.literal("applicationSummary")
    ),
    contextKey: v.string(),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user_feature_key", ["userId", "feature", "contextKey"])
    .index("by_expiry", ["expiresAt"]),

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
    /** Applications, cheers, messages, and new supporters on your own goals. */
    goalActivity: v.optional(v.boolean()),
    /** Invitations, application decisions, and check-ins for goals you motivate. */
    motivationActivity: v.optional(v.boolean()),
    /** Follow requests and new followers. */
    socialActivity: v.optional(v.boolean()),
    /** Welcome and confirmations when a goal goes live or reaches its target. */
    accountActivity: v.optional(v.boolean()),
    /** A new motivator joins one of your goals. */
    newMotivatorOnGoal: v.boolean(),
    /** Monday-morning summary of activity across your goals. */
    weeklyDigest: v.boolean(),
    /** Local-evening nudge when an active daily streak is still unlogged. */
    dailyStreakReminder: v.optional(v.boolean()),
    /** How often to nudge an owner whose active goal has no recent update. */
    goalUpdateReminderCadence: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))
    ),
    /** Alerts when an active goal is approaching or past its target date. */
    deadlineReminders: v.optional(v.boolean()),
    /** Consent-only marketing newsletter featuring approved public goals. */
    platformDigestCadence: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))
    ),
    /** Server timestamps provide an audit trail for the latest consent choice. */
    platformDigestConsentAt: v.optional(v.number()),
    platformDigestOptedOutAt: v.optional(v.number()),
    /** Medical / emergency / memorial goals in your area. */
    urgentCauses: v.boolean(),
    /** New features, design changes, occasional surveys. */
    productUpdates: v.boolean(),
    /** Master opt-out — suppresses ALL lifecycle email. Transactional still sends. */
    unsubscribedAll: v.boolean(),
    unsubscribedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_weekly_digest", ["weeklyDigest"])
    .index("by_platform_digest_cadence", ["platformDigestCadence"]),

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
    /** When the user opened/saw this notification in-app. null = unread. */
    readAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  /**
   * Follow graph — approval-gated.
   * A row represents a follow relationship (or request) from followerId
   * to followeeId. Only accepted followers can see private goals.
   */
  follows: defineTable({
    /** The person being followed. */
    followeeId: v.id("users"),
    /** The person requesting / holding the follow. */
    followerId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("removed")
    ),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_followee_status", ["followeeId", "status"])
    .index("by_follower_status", ["followerId", "status"])
    .index("by_follower_followee", ["followerId", "followeeId"]),
});
