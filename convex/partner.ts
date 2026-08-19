import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  MEASUREMENT_VERSION,
  getMeasurementMetric,
} from "../lib/goalMeasurementCatalog";
import {
  isAllowedAiblRedirectUri,
  publicSiteUrl,
  randomSecret,
  sha256Hex,
} from "./partnerCrypto";
import { firstNameOf, resolveAvatarUrl } from "./users";
import { buildSlug } from "./utils";

const PARTNER = "aibl";
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

const milestoneInput = v.object({
  id: v.string(),
  title: v.string(),
});

async function requireUserId(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

function goalPublicUrl(handle: string | undefined, slug: string) {
  const site = publicSiteUrl();
  if (handle) return `${site}/o/${handle}/${slug}`;
  return `${site}/dashboard`;
}

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      partner: v.string(),
      partnerUserId: v.union(v.string(), v.null()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const links = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    return links
      .filter((link) => !link.revokedAt)
      .map((link) => ({
        partner: link.partner,
        partnerUserId: link.partnerUserId ?? null,
        createdAt: link.createdAt,
      }));
  },
});

export const createAuthorizationCode = mutation({
  args: {
    redirectUri: v.string(),
    state: v.string(),
  },
  returns: v.object({ code: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isAllowedAiblRedirectUri(args.redirectUri)) {
      throw new Error("That AI Boss Leader return URL is not allowed");
    }
    const state = args.state.trim();
    if (!state || state.length > 200) {
      throw new Error("Invalid connect state");
    }
    const code = randomSecret("gmmcode");
    const now = Date.now();
    await ctx.db.insert("partnerAuthCodes", {
      userId,
      partner: PARTNER,
      codeHash: await sha256Hex(code),
      redirectUri: args.redirectUri,
      state,
      expiresAt: now + AUTH_CODE_TTL_MS,
      createdAt: now,
    });
    return { code };
  },
});

export const revoke = mutation({
  args: {},
  returns: v.object({ revoked: v.boolean() }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const links = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    const now = Date.now();
    for (const link of links) {
      if (!link.revokedAt) {
        await ctx.db.patch(link._id, { revokedAt: now, updatedAt: now });
      }
    }
    return { revoked: true };
  },
});

export const exchangeCode = internalMutation({
  args: {
    code: v.string(),
    redirectUri: v.string(),
    aiblUserId: v.string(),
  },
  returns: v.object({
    accessToken: v.string(),
    user: v.object({
      userId: v.string(),
      name: v.union(v.string(), v.null()),
      handle: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (ctx, args) => {
    const codeHash = await sha256Hex(args.code.trim());
    const authCode = await ctx.db
      .query("partnerAuthCodes")
      .withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash))
      .unique();
    if (!authCode || authCode.partner !== PARTNER) {
      throw new Error("Invalid or expired connect code");
    }
    if (authCode.usedAt) throw new Error("Connect code already used");
    if (authCode.expiresAt < Date.now()) throw new Error("Connect code expired");
    if (authCode.redirectUri !== args.redirectUri) {
      throw new Error("Redirect URL did not match");
    }
    await ctx.db.patch(authCode._id, { usedAt: Date.now() });

    const accessToken = randomSecret("gmmtok");
    const accessTokenHash = await sha256Hex(accessToken);
    const now = Date.now();
    const existing = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", authCode.userId).eq("partner", PARTNER)
      )
      .collect();
    const active = existing.find((link) => !link.revokedAt);
    if (active) {
      await ctx.db.patch(active._id, {
        accessTokenHash,
        partnerUserId: args.aiblUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("partnerLinks", {
        userId: authCode.userId,
        partner: PARTNER,
        partnerUserId: args.aiblUserId,
        accessTokenHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    const user = await ctx.db.get(authCode.userId);
    return {
      accessToken,
      user: {
        userId: authCode.userId,
        name: (user as { name?: string } | null)?.name ?? null,
        handle: (user as { handle?: string } | null)?.handle ?? null,
      },
    };
  },
});

export const getLinkByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      partnerUserId: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, { tokenHash }) => {
    const link = await ctx.db
      .query("partnerLinks")
      .withIndex("by_tokenHash", (q) => q.eq("accessTokenHash", tokenHash))
      .unique();
    if (!link || link.revokedAt || link.partner !== PARTNER) return null;
    return {
      userId: link.userId,
      partnerUserId: link.partnerUserId ?? null,
    };
  },
});

export const getMe = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    userId: v.string(),
    name: v.union(v.string(), v.null()),
    handle: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return {
      userId,
      name: (user as { name?: string } | null)?.name ?? null,
      handle: (user as { handle?: string } | null)?.handle ?? null,
    };
  },
});

export const createOrGetGoal = internalMutation({
  args: {
    userId: v.id("users"),
    partnerCampaignId: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    milestones: v.optional(v.array(milestoneInput)),
    completedCount: v.optional(v.number()),
    totalCount: v.optional(v.number()),
  },
  returns: v.object({
    goalId: v.id("goals"),
    slug: v.string(),
    publicUrl: v.string(),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingMap = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_user_campaign", (q) =>
        q
          .eq("userId", args.userId)
          .eq("partner", PARTNER)
          .eq("partnerCampaignId", args.partnerCampaignId)
      )
      .unique();
    if (existingMap) {
      const goal = await ctx.db.get(existingMap.goalId);
      if (goal) {
        return {
          goalId: goal._id,
          slug: goal.slug,
          publicUrl: goalPublicUrl(goal.ownerHandle, goal.slug),
          created: false,
        };
      }
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const title = args.title.trim().slice(0, 120);
    if (!title) throw new Error("Title is required");

    const milestoneTitles = (args.milestones ?? [])
      .map((item) => ({
        id: item.id.trim() || randomSecret("ms").slice(0, 12),
        title: item.title.trim().slice(0, 120),
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, 8);

    const useMilestones = milestoneTitles.length > 0;
    const metric = useMilestones
      ? getMeasurementMetric("launch", "launch.plan")
      : getMeasurementMetric("habit", "habit.sessions");
    if (!metric) throw new Error("Measurement catalog missing");

    const startValue = 0;
    const currentValue = Math.max(0, args.completedCount ?? 0);
    const targetValue = useMilestones
      ? milestoneTitles.length
      : Math.max(1, args.totalCount ?? 1);

    const ownerName =
      (user as { name?: string }).name ??
      (user as { email?: string }).email ??
      undefined;
    const ownerImage = (await resolveAvatarUrl(ctx, user)) ?? undefined;
    const ownerHandle = (user as { handle?: string }).handle ?? undefined;
    const namespaceKey = ownerHandle ?? args.userId;

    let slug = buildSlug(title);
    let suffix = 2;
    for (;;) {
      const collision = await ctx.db
        .query("goals")
        .withIndex("by_handle_slug", (q) =>
          q.eq("ownerHandle", namespaceKey).eq("slug", slug)
        )
        .first();
      if (!collision) break;
      slug = `${buildSlug(title)}-${suffix}`;
      suffix += 1;
      if (suffix > 100) break;
    }

    const now = Date.now();
    const story =
      args.story?.trim().slice(0, 3000) ||
      `Synced from AI Boss Leader campaign “${title}”.`;
    const summary =
      args.summary?.trim().slice(0, 280) ||
      "Work this campaign in AI Boss Leader. Progress shows up here.";

    const targetDate =
      args.targetDate && args.targetDate > now ? args.targetDate : undefined;

    const goalId = await ctx.db.insert("goals", {
      ownerId: args.userId,
      ownerName,
      ownerImage,
      ownerHandle,
      title,
      summary,
      story,
      category: metric.categoryId,
      metricId: metric.id,
      measurementVersion: MEASUREMENT_VERSION,
      unit: metric.defaultUnit,
      progressType: metric.progressType,
      startValue,
      targetValue,
      currentValue: Math.min(currentValue, targetValue),
      direction: "increase",
      targetDate,
      milestones: useMilestones
        ? milestoneTitles.map((item) => ({
            id: item.id,
            title: item.title,
            done: false,
          }))
        : undefined,
      supporterCount: 0,
      supportTypes: ["encourage"],
      status: "active",
      visibility: "unlisted",
      isAnonymous: false,
      slug,
      moderationStatus: "pending",
      createdAt: now,
      updatedAt: now,
      publicMotivatorPolicy: "approval",
      coreMotivatorMin: 3,
    });

    await ctx.db.insert("partnerGoalMaps", {
      userId: args.userId,
      partner: PARTNER,
      partnerCampaignId: args.partnerCampaignId,
      goalId,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.moderation.reviewGoal, { goalId });

    const ownerEmail = (user as { email?: string }).email;
    if (ownerEmail) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: args.userId,
        toEmail: ownerEmail,
        templateId: "goalCreated",
        category: "lifecycle",
        preferenceKey: "accountActivity",
        payload: JSON.stringify({
          firstName: firstNameOf(user),
          goalTitle: title,
          slug,
          ownerHandle,
        }),
      });
    }

    return {
      goalId,
      slug,
      publicUrl: goalPublicUrl(ownerHandle, slug),
      created: true,
    };
  },
});

export const applyProgress = internalMutation({
  args: {
    userId: v.id("users"),
    partnerCampaignId: v.string(),
    partnerTaskId: v.string(),
    title: v.string(),
    completedCount: v.optional(v.number()),
    totalCount: v.optional(v.number()),
    campaignComplete: v.optional(v.boolean()),
  },
  returns: v.object({
    goalId: v.id("goals"),
    synced: v.boolean(),
    completed: v.boolean(),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_user_campaign", (q) =>
        q
          .eq("userId", args.userId)
          .eq("partner", PARTNER)
          .eq("partnerCampaignId", args.partnerCampaignId)
      )
      .unique();
    if (!map) throw new Error("This campaign is not shared to GoMotivateMe yet");

    const goal = await ctx.db.get(map.goalId);
    if (!goal || goal.ownerId !== args.userId) {
      throw new Error("Linked goal not found");
    }

    const existingTask = await ctx.db
      .query("partnerTaskMaps")
      .withIndex("by_task", (q) =>
        q
          .eq("userId", args.userId)
          .eq("partner", PARTNER)
          .eq("partnerTaskId", args.partnerTaskId)
      )
      .unique();

    const now = Date.now();
    let completed = goal.status === "completed";

    if (!existingTask) {
      let milestoneId: string | undefined;
      if (goal.progressType === "milestones" && goal.milestones) {
        const match =
          goal.milestones.find(
            (item) =>
              !item.done &&
              item.title.toLowerCase() === args.title.trim().toLowerCase()
          ) || goal.milestones.find((item) => !item.done);
        if (match) {
          milestoneId = match.id;
          const milestones = goal.milestones.map((item) =>
            item.id === match.id
              ? { ...item, done: true, completedAt: now }
              : item
          );
          const completedCount = milestones.filter((item) => item.done).length;
          await ctx.db.patch(goal._id, {
            milestones,
            currentValue: completedCount,
            updatedAt: now,
            lastStaleReminderAt: undefined,
          });
          await ctx.db.insert("updates", {
            goalId: goal._id,
            ownerId: args.userId,
            type: "milestone",
            milestoneId: match.id,
            note: match.title,
            moderationStatus: "approved",
            publicVisible: true,
            createdAt: now,
          });
          if (completedCount === milestones.length && goal.status !== "completed") {
            await ctx.db.patch(goal._id, {
              status: "completed",
              completedAt: now,
              updatedAt: now,
            });
            completed = true;
          }
        }
      } else {
        const nextValue = Math.max(
          goal.currentValue ?? 0,
          args.completedCount ?? (goal.currentValue ?? 0) + 1
        );
        await ctx.db.patch(goal._id, {
          currentValue: nextValue,
          updatedAt: now,
          lastStaleReminderAt: undefined,
        });
        await ctx.db.insert("updates", {
          goalId: goal._id,
          ownerId: args.userId,
          type: "note",
          note: args.title.trim().slice(0, 500) || "Completed a task in AI Boss Leader",
          moderationStatus: "pending",
          publicVisible: false,
          createdAt: now,
        });
      }

      await ctx.db.insert("partnerTaskMaps", {
        userId: args.userId,
        partner: PARTNER,
        partnerCampaignId: args.partnerCampaignId,
        partnerTaskId: args.partnerTaskId,
        goalId: goal._id,
        milestoneId,
        createdAt: now,
      });
    }

    if (args.campaignComplete && goal.status !== "completed") {
      await ctx.db.patch(goal._id, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
      completed = true;
    }

    const fresh = await ctx.db.get(goal._id);
    return {
      goalId: goal._id,
      synced: true,
      completed: fresh?.status === "completed" || completed,
      publicUrl: goalPublicUrl(fresh?.ownerHandle ?? goal.ownerHandle, goal.slug),
    };
  },
});

export const completeGoal = internalMutation({
  args: {
    userId: v.id("users"),
    partnerCampaignId: v.string(),
  },
  returns: v.object({
    goalId: v.id("goals"),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_user_campaign", (q) =>
        q
          .eq("userId", args.userId)
          .eq("partner", PARTNER)
          .eq("partnerCampaignId", args.partnerCampaignId)
      )
      .unique();
    if (!map) throw new Error("This campaign is not shared to GoMotivateMe yet");
    const goal = await ctx.db.get(map.goalId);
    if (!goal || goal.ownerId !== args.userId) throw new Error("Linked goal not found");
    const now = Date.now();
    if (goal.status !== "completed") {
      await ctx.db.patch(goal._id, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
    }
    return {
      goalId: goal._id,
      publicUrl: goalPublicUrl(goal.ownerHandle, goal.slug),
    };
  },
});

export const listLinkedGoals = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      partnerCampaignId: v.string(),
      goalId: v.id("goals"),
      title: v.string(),
      slug: v.string(),
      status: v.string(),
      publicUrl: v.string(),
    })
  ),
  handler: async (ctx, { userId }) => {
    const maps = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_user_campaign", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    const out = [];
    for (const map of maps) {
      const goal = await ctx.db.get(map.goalId);
      if (!goal) continue;
      out.push({
        partnerCampaignId: map.partnerCampaignId,
        goalId: goal._id,
        title: goal.title,
        slug: goal.slug,
        status: goal.status,
        publicUrl: goalPublicUrl(goal.ownerHandle, goal.slug),
      });
    }
    return out;
  },
});

export const listOwnerGoalsForPartner = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      goalId: v.id("goals"),
      title: v.string(),
      slug: v.string(),
      status: v.string(),
      publicUrl: v.string(),
      partnerCampaignId: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, { userId }) => {
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(50);
    const maps = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_user_campaign", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    const campaignByGoal = new Map(maps.map((row) => [row.goalId, row.partnerCampaignId]));
    return goals.map((goal) => ({
      goalId: goal._id,
      title: goal.title,
      slug: goal.slug,
      status: goal.status,
      publicUrl: goalPublicUrl(goal.ownerHandle, goal.slug),
      partnerCampaignId: campaignByGoal.get(goal._id) ?? null,
    }));
  },
});

export const registerInbound = internalMutation({
  args: {
    userId: v.id("users"),
    aiblAccessToken: v.string(),
    aiblSiteUrl: v.string(),
  },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", args.userId).eq("partner", PARTNER)
      )
      .collect();
    const active = links.find((link) => !link.revokedAt);
    if (!active) throw new Error("Connect AI Boss Leader first");
    const site = args.aiblSiteUrl.replace(/\/$/, "");
    if (!site.startsWith("https://") && !site.includes("localhost")) {
      throw new Error("Invalid AI Boss Leader site URL");
    }
    await ctx.db.patch(active._id, {
      aiblAccessToken: args.aiblAccessToken.trim(),
      aiblSiteUrl: site,
      updatedAt: Date.now(),
    });
    const user = await ctx.db.get(args.userId);
    const email = (user as { email?: string } | null)?.email;
    if (email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: args.userId,
        toEmail: email,
        templateId: "partnerSync",
        category: "transactional",
        payload: JSON.stringify({
          firstName: firstNameOf(user),
          kind: "connected",
          title: "AI Boss Leader",
          gmmUrl: `${publicSiteUrl()}/dashboard`,
          aiblUrl: "https://www.iamaibl.com",
        }),
      });
    }
    return { saved: true };
  },
});

export const getAiblTarget = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      aiblAccessToken: v.string(),
      aiblSiteUrl: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    const links = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    const active = links.find((link) => !link.revokedAt);
    if (!active?.aiblAccessToken || !active.aiblSiteUrl) return null;
    return {
      aiblAccessToken: active.aiblAccessToken,
      aiblSiteUrl: active.aiblSiteUrl,
    };
  },
});

export const getGoalPushPayload = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals") },
  returns: v.union(
    v.object({
      goalId: v.string(),
      title: v.string(),
      story: v.string(),
      campaignId: v.union(v.string(), v.null()),
      milestones: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          done: v.boolean(),
        })
      ),
      updates: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, { userId, goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const map = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .first();
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .take(20);
    return {
      goalId,
      title: goal.title,
      story: (goal.story || goal.summary || "").slice(0, 3000),
      campaignId: map?.partnerCampaignId ?? null,
      milestones: (goal.milestones ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        done: item.done,
      })),
      updates: updates
        .filter((row) => !row.revertedAt)
        .map((row) => ({
          id: row._id,
          title: (row.note || row.type).slice(0, 120),
        })),
    };
  },
});

export const rememberCampaignMap = internalMutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    partnerCampaignId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { partnerCampaignId: args.partnerCampaignId });
      return null;
    }
    await ctx.db.insert("partnerGoalMaps", {
      userId: args.userId,
      partner: PARTNER,
      partnerCampaignId: args.partnerCampaignId,
      goalId: args.goalId,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const rememberTaskMap = internalMutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    partnerCampaignId: v.string(),
    partnerTaskId: v.string(),
    gmmKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("partnerTaskMaps")
      .withIndex("by_gmmKey", (q) =>
        q.eq("userId", args.userId).eq("partner", PARTNER).eq("gmmKey", args.gmmKey)
      )
      .unique();
    if (existing) return null;
    await ctx.db.insert("partnerTaskMaps", {
      userId: args.userId,
      partner: PARTNER,
      partnerCampaignId: args.partnerCampaignId,
      partnerTaskId: args.partnerTaskId,
      goalId: args.goalId,
      gmmKey: args.gmmKey,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const enqueuePartnerSyncEmail = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.string(),
    title: v.string(),
    gmmUrl: v.optional(v.string()),
    aiblUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const email = (user as { email?: string } | null)?.email;
    if (!email) return null;
    await ctx.runMutation(internal.emails.enqueue, {
      userId: args.userId,
      toEmail: email,
      templateId: "partnerSync",
      category: "transactional",
      payload: JSON.stringify({
        firstName: firstNameOf(user),
        kind: args.kind,
        title: args.title,
        gmmUrl: args.gmmUrl ?? `${publicSiteUrl()}/dashboard`,
        aiblUrl: args.aiblUrl ?? "https://www.iamaibl.com",
      }),
    });
    return null;
  },
});

export const getMapForGoal = query({
  args: { goalId: v.id("goals") },
  returns: v.union(
    v.object({
      partnerCampaignId: v.string(),
      connected: v.boolean(),
      canPush: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const links = await ctx.db
      .query("partnerLinks")
      .withIndex("by_user_partner", (q) =>
        q.eq("userId", userId).eq("partner", PARTNER)
      )
      .collect();
    const active = links.find((link) => !link.revokedAt);
    const map = await ctx.db
      .query("partnerGoalMaps")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .first();
    return {
      partnerCampaignId: map?.partnerCampaignId ?? "",
      connected: Boolean(active),
      canPush: Boolean(active?.aiblAccessToken && active.aiblSiteUrl),
    };
  },
});
