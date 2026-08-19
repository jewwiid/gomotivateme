import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sha256Hex } from "./partnerCrypto";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export const partnerOptions = httpAction(async () => {
  return new Response(null, { status: 204, headers: jsonHeaders });
});

type PartnerHttpCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function requirePartnerUser(ctx: PartnerHttpCtx, request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new Error("Missing partner token");
  }
  const tokenHash = await sha256Hex(token);
  const link = await ctx.runQuery(internal.partner.getLinkByTokenHash, { tokenHash });
  if (!link) throw new Error("Invalid or revoked partner token");
  return link;
}

export const partnerToken = httpAction(async (ctx, request) => {
  try {
    const body = await readJson(request);
    const code = asString(body.code);
    const redirectUri = asString(body.redirectUri ?? body.redirect_uri);
    const aiblUserId = asString(body.aiblUserId ?? body.aibl_user_id);
    if (!code || !redirectUri || !aiblUserId) {
      return json({ error: "code, redirectUri, and aiblUserId are required" }, 400);
    }
    const result = await ctx.runMutation(internal.partner.exchangeCode, {
      code,
      redirectUri,
      aiblUserId,
    });
    return json({
      access_token: result.accessToken,
      token_type: "Bearer",
      user: result.user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return json({ error: message }, 400);
  }
});

export const partnerMe = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const me = await ctx.runQuery(internal.partner.getMe, { userId: link.userId });
    return json({ user: me });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return json({ error: message }, 401);
  }
});

export const partnerGoalsGet = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const goals = await ctx.runQuery(internal.partner.listOwnerGoalsForPartner, {
      userId: link.userId,
    });
    return json({ goals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return json({ error: message }, 401);
  }
});

export const partnerGoalsCreate = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const body = await readJson(request);
    const partnerCampaignId = asString(body.partnerCampaignId ?? body.campaignId);
    const title = asString(body.title);
    if (!partnerCampaignId || !title) {
      return json({ error: "campaignId and title are required" }, 400);
    }
    const rawMilestones = Array.isArray(body.milestones) ? body.milestones : [];
    const milestones = rawMilestones
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { id?: unknown; title?: unknown };
        const milestoneTitle = asString(row.title);
        if (!milestoneTitle) return null;
        return {
          id: asString(row.id) || milestoneTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
          title: milestoneTitle,
        };
      })
      .filter((item): item is { id: string; title: string } => item !== null);

    const result = await ctx.runMutation(internal.partner.createOrGetGoal, {
      userId: link.userId,
      partnerCampaignId,
      title,
      summary: asString(body.summary) || undefined,
      story: asString(body.story) || undefined,
      targetDate: asNumber(body.targetDate),
      milestones: milestones.length > 0 ? milestones : undefined,
      completedCount: asNumber(body.completedCount),
      totalCount: asNumber(body.totalCount),
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create goal";
    const status = message.toLowerCase().includes("token") ? 401 : 400;
    return json({ error: message }, status);
  }
});

export const partnerProgress = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const body = await readJson(request);
    const partnerCampaignId = asString(body.partnerCampaignId ?? body.campaignId);
    const partnerTaskId = asString(body.partnerTaskId ?? body.taskId);
    const title = asString(body.title) || "Completed a task in AI Boss Leader";
    if (!partnerCampaignId || !partnerTaskId) {
      return json({ error: "campaignId and taskId are required" }, 400);
    }
    const result = await ctx.runMutation(internal.partner.applyProgress, {
      userId: link.userId,
      partnerCampaignId,
      partnerTaskId,
      title,
      completedCount: asNumber(body.completedCount),
      totalCount: asNumber(body.totalCount),
      campaignComplete: asBoolean(body.campaignComplete),
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sync progress";
    const status = message.toLowerCase().includes("token") ? 401 : 400;
    return json({ error: message }, status);
  }
});

export const partnerComplete = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const body = await readJson(request);
    const partnerCampaignId = asString(body.partnerCampaignId ?? body.campaignId);
    if (!partnerCampaignId) return json({ error: "campaignId is required" }, 400);
    const result = await ctx.runMutation(internal.partner.completeGoal, {
      userId: link.userId,
      partnerCampaignId,
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete goal";
    const status = message.toLowerCase().includes("token") ? 401 : 400;
    return json({ error: message }, status);
  }
});

export const partnerRegisterInbound = httpAction(async (ctx, request) => {
  try {
    const link = await requirePartnerUser(ctx, request);
    const body = await readJson(request);
    const aiblAccessToken = asString(body.aiblAccessToken);
    const aiblSiteUrl = asString(body.aiblSiteUrl);
    if (!aiblAccessToken || !aiblSiteUrl) {
      return json({ error: "aiblAccessToken and aiblSiteUrl are required" }, 400);
    }
    const result = await ctx.runMutation(internal.partner.registerInbound, {
      userId: link.userId,
      aiblAccessToken,
      aiblSiteUrl,
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register inbound";
    const status = message.toLowerCase().includes("token") ? 401 : 400;
    return json({ error: message }, status);
  }
});
