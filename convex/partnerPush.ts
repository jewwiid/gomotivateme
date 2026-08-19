import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type AiblTarget = { aiblAccessToken: string; aiblSiteUrl: string };

type GoalPushPayload = {
  goalId: string;
  title: string;
  story: string;
  summary: string;
  publicUrl: string;
  slug: string;
  category: string;
  progressType: string;
  unit: string;
  metricId: string | null;
  currentValue: number;
  targetValue: number;
  targetDate: number | null;
  supportTypes: string[];
  campaignId: string | null;
  milestones: Array<{ id: string; title: string; done: boolean }>;
  updates: Array<{ id: string; title: string }>;
};

async function aiblRequest(
  siteUrl: string,
  token: string,
  path: string,
  body: unknown
) {
  const response = await fetch(`${siteUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `AI Boss Leader request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

export const pushGoalToAibl = action({
  args: { goalId: v.id("goals") },
  returns: v.object({
    campaignId: v.string(),
    taskCount: v.number(),
  }),
  handler: async (ctx, { goalId }): Promise<{ campaignId: string; taskCount: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const target = (await ctx.runQuery(internal.partner.getAiblTarget, {
      userId,
    })) as AiblTarget | null;
    if (!target) {
      throw new Error("Connect AI Boss Leader from AIBL Profile first, then return here");
    }
    const payload = (await ctx.runQuery(internal.partner.getGoalPushPayload, {
      userId,
      goalId,
    })) as GoalPushPayload | null;
    if (!payload) throw new Error("Goal not found");

    const campaign = await aiblRequest(
      target.aiblSiteUrl,
      target.aiblAccessToken,
      "/partner/v1/campaigns",
      {
        goalId: payload.goalId,
        title: payload.title,
        story: payload.story,
        summary: payload.summary,
        websiteUrl: payload.publicUrl,
        publicUrl: payload.publicUrl,
        slug: payload.slug,
        category: payload.category,
        progressType: payload.progressType,
        unit: payload.unit,
        metricId: payload.metricId,
        currentValue: payload.currentValue,
        targetValue: payload.targetValue,
        targetDate: payload.targetDate,
        supportTypes: payload.supportTypes,
        campaignId: payload.campaignId,
        milestones: payload.milestones,
      }
    );
    const campaignId = String(campaign.campaignId || payload.campaignId || "");
    if (!campaignId) throw new Error("AI Boss Leader did not return a campaign");
    await ctx.runMutation(internal.partner.rememberCampaignMap, {
      userId,
      goalId,
      partnerCampaignId: campaignId,
    });

    let taskCount = 0;
    const items: Array<{ key: string; title: string; done: boolean }> =
      payload.milestones.length > 0
        ? payload.milestones.map((item) => ({
            key: `milestone:${item.id}`,
            title: item.title,
            done: item.done,
          }))
        : payload.updates.map((item) => ({
            key: `update:${item.id}`,
            title: item.title,
            done: false,
          }));

    for (const item of items) {
      const task = await aiblRequest(
        target.aiblSiteUrl,
        target.aiblAccessToken,
        "/partner/v1/tasks",
        {
          campaignId,
          goalId: payload.goalId,
          gmmKey: item.key,
          title: item.title,
          completed: item.done,
          description: payload.summary || payload.story,
          websiteUrl: payload.publicUrl,
        }
      );
      const taskId = String(task.taskId || "");
      if (taskId) {
        await ctx.runMutation(internal.partner.rememberTaskMap, {
          userId,
          goalId,
          partnerCampaignId: campaignId,
          partnerTaskId: taskId,
          gmmKey: item.key,
        });
        taskCount += 1;
      }
    }

    await ctx.runMutation(internal.partner.enqueuePartnerSyncEmail, {
      userId,
      kind: "goal_to_aibl",
      title: payload.title,
      aiblUrl: "https://www.iamaibl.com",
    });

    return { campaignId, taskCount };
  },
});

export const pushUpdateToAibl = action({
  args: {
    goalId: v.id("goals"),
    gmmKey: v.string(),
    title: v.string(),
    completed: v.optional(v.boolean()),
  },
  returns: v.object({ synced: v.boolean() }),
  handler: async (ctx, args): Promise<{ synced: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const target = (await ctx.runQuery(internal.partner.getAiblTarget, {
      userId,
    })) as AiblTarget | null;
    if (!target) return { synced: false };
    const payload = (await ctx.runQuery(internal.partner.getGoalPushPayload, {
      userId,
      goalId: args.goalId,
    })) as GoalPushPayload | null;
    if (!payload?.campaignId) return { synced: false };
    const task = await aiblRequest(
      target.aiblSiteUrl,
      target.aiblAccessToken,
      "/partner/v1/tasks",
      {
        campaignId: payload.campaignId,
        goalId: payload.goalId,
        gmmKey: args.gmmKey,
        title: args.title,
        completed: args.completed ?? false,
      }
    );
    const taskId = String(task.taskId || "");
    if (taskId) {
      await ctx.runMutation(internal.partner.rememberTaskMap, {
        userId,
        goalId: args.goalId,
        partnerCampaignId: payload.campaignId,
        partnerTaskId: taskId,
        gmmKey: args.gmmKey,
      });
    }
    return { synced: true };
  },
});

export const pushUpdateToAiblInternal = internalAction({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    gmmKey: v.string(),
    title: v.string(),
    completed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      const target = (await ctx.runQuery(internal.partner.getAiblTarget, {
        userId: args.userId,
      })) as AiblTarget | null;
      if (!target) return null;
      const payload = (await ctx.runQuery(internal.partner.getGoalPushPayload, {
        userId: args.userId,
        goalId: args.goalId,
      })) as GoalPushPayload | null;
      if (!payload?.campaignId) return null;
      const response = await fetch(`${target.aiblSiteUrl.replace(/\/$/, "")}/partner/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${target.aiblAccessToken}`,
        },
        body: JSON.stringify({
          campaignId: payload.campaignId,
          goalId: payload.goalId,
          gmmKey: args.gmmKey,
          title: args.title,
          completed: args.completed ?? false,
        }),
      });
      const task = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const taskId = String(task.taskId || "");
      if (taskId) {
        await ctx.runMutation(internal.partner.rememberTaskMap, {
          userId: args.userId,
          goalId: args.goalId,
          partnerCampaignId: payload.campaignId,
          partnerTaskId: taskId,
          gmmKey: args.gmmKey,
        });
      }
    } catch (error) {
      console.error("[partner] GMM→AIBL update sync failed", error);
    }
    return null;
  },
});
