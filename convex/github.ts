// @ts-nocheck -- Convex's generated internal API types are recursively
// inferred in this module because scheduled actions invoke one another.
/**
 * GitHub → GoMotivateMe goal sync.
 *
 * GitHub is connected here, once, because goals are owned by GoMotivateMe.
 * AIBL receives the resulting goal activity through the existing partner
 * channel; it does not need a second GitHub authorization.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { randomSecret, sha256Hex } from "./partnerCrypto";

const DAY_MS = 86_400_000;
const INSTALL_STATE_TTL_MS = 10 * 60 * 1000;
const AUTHORIZATION_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_BACKFILL_MS = 90 * DAY_MS;
const GITHUB_API = "https://api.github.com";

const activityKindValidator = v.union(
  v.literal("commits"),
  v.literal("merged_prs"),
  v.literal("both")
);
const progressModeValidator = v.union(v.literal("activity"), v.literal("progress"));

type GithubEvent = {
  eventKey: string;
  kind: "commit" | "merged_pr";
  title: string;
  url: string;
  authorLogin?: string;
  occurredAt: number;
  rawSummary?: string;
};

function dateNumber(value: unknown) {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function compactTitle(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (text || fallback).slice(0, 180);
}

function naturalList(items: string[]) {
  if (items.length <= 1) return items[0] || "the recorded work";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function dailySummaryParagraph(activities: any[]) {
  const titles = activities.slice(0, 5).map((row) => row.title);
  return activities.length > 0
    ? `The work focused on ${naturalList(titles)}.`
    : "No work was recorded for this day.";
}

function isProgressCompatible(goal: any, activityKind: "commits" | "merged_prs" | "both") {
  if (goal?.progressType !== "number" || goal?.direction !== "increase") return false;
  const metricId = String(goal?.metricId || "");
  if (activityKind === "commits") return metricId.endsWith("github-commits") && goal.unit === "commits";
  if (activityKind === "merged_prs") {
    return metricId.endsWith("github-pull-requests") && goal.unit === "pull requests";
  }
  return false;
}

async function requireUserId(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

async function githubFetch(token: string, pathOrUrl: string) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GITHUB_API}${pathOrUrl}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GoMotivateMe-GitHub-Integration",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (payload as any)?.message === "string"
      ? (payload as any).message
      : `GitHub request failed (${response.status})`;
    throw new Error(message);
  }
  return { payload, next: nextLink(response.headers.get("link")) };
}

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemBytes(value: string) {
  const normalized = value.replace(/\\n/g, "\n");
  if (normalized.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("GITHUB_APP_PRIVATE_KEY must be a PKCS#8 PEM. Convert GitHub's downloaded key with: openssl pkcs8 -topk8 -nocrypt -in github-app.pem");
  }
  const body = normalized.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function createGitHubAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) throw new Error("GitHub App is not configured yet. Add GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to the GoMotivateMe Convex environment.");
  const now = Math.floor(Date.now() / 1_000);
  const signingInput = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function githubAppFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${await createGitHubAppJwt()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GoMotivateMe-GitHub-App",
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : `GitHub App request failed (${response.status})`);
  return payload as any;
}

async function installationAccessToken(installationId: string) {
  const payload = await githubAppFetch(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (typeof payload?.token !== "string") throw new Error("GitHub did not return an installation token");
  return payload.token;
}

function nextLink(header: string | null) {
  if (!header) return null;
  const match = header.split(",").find((item) => /rel="next"/.test(item));
  const url = match?.match(/<([^>]+)>/)?.[1];
  return url || null;
}

async function fetchPages(token: string, firstUrl: string, maxPages = 10) {
  const rows: any[] = [];
  let url: string | null = firstUrl;
  let page = 0;
  while (url && page < maxPages) {
    const result = await githubFetch(token, url);
    // User OAuth endpoints return arrays, while GitHub App installation
    // endpoints return { total_count, repositories }. Support both so an
    // installed App never looks connected while displaying zero repositories.
    if (Array.isArray(result.payload)) rows.push(...result.payload);
    else if (Array.isArray((result.payload as any)?.repositories)) rows.push(...(result.payload as any).repositories);
    url = result.next;
    page += 1;
  }
  return rows;
}

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { connected: false as const };
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!connection || connection.revokedAt) return { connected: false as const };
    return {
      connected: true as const,
      login: connection.login,
      avatarUrl: connection.avatarUrl ?? null,
      repositorySelection: connection.repositorySelection ?? null,
      updatedAt: connection.updatedAt,
    };
  },
});

export const beginConnect = action({
  args: { returnTo: v.optional(v.string()) },
  returns: v.object({ authorizationUrl: v.string() }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const clientId = process.env.GITHUB_APP_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_APP_AUTHORIZATION_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      throw new Error("GitHub connection verification is not configured yet. Add the GitHub App client ID and authorization callback URL.");
    }
    const state = randomSecret("githubauth");
    await ctx.runMutation(internal.github.createAppAuthorizationState, {
      userId,
      stateHash: await sha256Hex(state),
      returnTo: args.returnTo?.startsWith("/dashboard/") ? args.returnTo : undefined,
    });
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", callbackUrl);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "read:user");
    return { authorizationUrl: url.toString() };
  },
});

export const createAppAuthorizationState = internalMutation({
  args: { userId: v.id("users"), stateHash: v.string(), returnTo: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("githubAppAuthorizationStates", {
      userId: args.userId,
      stateHash: args.stateHash,
      returnTo: args.returnTo,
      expiresAt: now + AUTHORIZATION_STATE_TTL_MS,
      createdAt: now,
    });
    return null;
  },
});

export const getAppAuthorizationState = internalQuery({
  args: { stateHash: v.string() },
  handler: async (ctx, { stateHash }) => {
    const record = await ctx.db
      .query("githubAppAuthorizationStates")
      .withIndex("by_state_hash", (q) => q.eq("stateHash", stateHash))
      .unique();
    if (!record || record.usedAt || record.expiresAt < Date.now()) return null;
    return { userId: record.userId, returnTo: record.returnTo };
  },
});

export const markAppAuthorizationStateUsed = internalMutation({
  args: { stateHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { stateHash }) => {
    const record = await ctx.db
      .query("githubAppAuthorizationStates")
      .withIndex("by_state_hash", (q) => q.eq("stateHash", stateHash))
      .unique();
    if (record && !record.usedAt) await ctx.db.patch(record._id, { usedAt: Date.now() });
    return null;
  },
});

export const saveAppAuthorizationCandidates = internalMutation({
  args: {
    userId: v.id("users"),
    candidates: v.array(v.object({
      githubUserId: v.string(),
      githubLogin: v.string(),
      githubAvatarUrl: v.optional(v.string()),
      installationId: v.string(),
      installationLogin: v.string(),
      installationAvatarUrl: v.optional(v.string()),
      installationAccountType: v.optional(v.string()),
      repositorySelection: v.optional(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { userId, candidates }) => {
    const current = await ctx.db.query("githubAppAuthorizationCandidates").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    await Promise.all(current.map((candidate) => ctx.db.delete(candidate._id)));
    const now = Date.now();
    await Promise.all(candidates.map((candidate) => ctx.db.insert("githubAppAuthorizationCandidates", {
      userId,
      ...candidate,
      expiresAt: now + AUTHORIZATION_STATE_TTL_MS,
      createdAt: now,
    })));
    return null;
  },
});

export const listAuthorizationCandidates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const candidates = await ctx.db.query("githubAppAuthorizationCandidates").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    return candidates
      .filter((candidate) => candidate.expiresAt >= Date.now())
      .map(({ installationId, installationLogin, installationAvatarUrl, installationAccountType, repositorySelection }) => ({
        installationId,
        installationLogin,
        installationAvatarUrl,
        installationAccountType,
        repositorySelection,
      }));
  },
});

export const createAppInstallState = internalMutation({
  args: { userId: v.id("users"), stateHash: v.string(), returnTo: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("githubAppInstallStates", {
      userId: args.userId,
      stateHash: args.stateHash,
      returnTo: args.returnTo,
      expiresAt: now + INSTALL_STATE_TTL_MS,
      createdAt: now,
    });
    return null;
  },
});

export const getAppInstallState = internalQuery({
  args: { stateHash: v.string() },
  handler: async (ctx, { stateHash }) => {
    const record = await ctx.db
      .query("githubAppInstallStates")
      .withIndex("by_state_hash", (q) => q.eq("stateHash", stateHash))
      .unique();
    if (!record || record.usedAt || record.expiresAt < Date.now()) return null;
    return { userId: record.userId, returnTo: record.returnTo };
  },
});

export const completeAppInstallation = internalMutation({
  args: {
    stateHash: v.string(),
    githubUserId: v.string(),
    login: v.string(),
    avatarUrl: v.optional(v.string()),
    installationId: v.string(),
    installationAccountType: v.optional(v.string()),
    repositorySelection: v.optional(v.string()),
  },
  returns: v.object({ connected: v.boolean() }),
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("githubAppInstallStates")
      .withIndex("by_state_hash", (q) => q.eq("stateHash", args.stateHash))
      .unique();
    if (!state || state.usedAt || state.expiresAt < Date.now()) {
      throw new Error("This GitHub connection link is invalid or expired");
    }
    const now = Date.now();
    const current = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", state.userId))
      .unique();
    const patch = {
      authType: "github_app" as const,
      accessToken: undefined,
      installationId: args.installationId,
      installationAccountType: args.installationAccountType,
      repositorySelection: args.repositorySelection,
      githubUserId: args.githubUserId,
      login: args.login,
      avatarUrl: args.avatarUrl,
      updatedAt: now,
      revokedAt: undefined,
    };
    if (current) await ctx.db.patch(current._id, patch);
    else await ctx.db.insert("githubConnections", { userId: state.userId, ...patch, createdAt: now });
    await ctx.db.patch(state._id, { usedAt: now });
    return { connected: true };
  },
});

export const finalizeAppInstallation = internalAction({
  args: { state: v.string(), installationId: v.string() },
  returns: v.object({ connected: v.boolean(), returnTo: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const stateHash = await sha256Hex(args.state);
    const pending = await ctx.runQuery(internal.github.getAppInstallState, { stateHash });
    if (!pending) throw new Error("This GitHub App installation link is invalid or expired");
    const installation = await githubAppFetch(`/app/installations/${encodeURIComponent(args.installationId)}`);
    const githubUserId = installation?.account?.id !== undefined ? String(installation.account.id) : "";
    const login = typeof installation?.account?.login === "string" ? installation.account.login : "";
    if (!githubUserId || !login) throw new Error("GitHub did not return the installation account");
    await ctx.runMutation(internal.github.completeAppInstallation, {
      stateHash,
      githubUserId,
      login,
      avatarUrl: typeof installation?.account?.avatar_url === "string" ? installation.account.avatar_url : undefined,
      installationId: args.installationId,
      installationAccountType: typeof installation?.target_type === "string" ? installation.target_type : undefined,
      repositorySelection: typeof installation?.repository_selection === "string" ? installation.repository_selection : undefined,
    });
    await ctx.runAction(internal.github.refreshRepositoriesForUser, { userId: pending.userId, installationId: args.installationId });
    return { connected: true, returnTo: pending.returnTo };
  },
});

async function connectVerifiedInstallation(ctx: any, args: {
  userId: any;
  githubUserId: string;
  login: string;
  avatarUrl?: string;
  installationId: string;
  installationAccountType?: string;
  repositorySelection?: string;
}) {
  await ctx.runMutation(internal.github.completeVerifiedAppInstallation, args);
  await ctx.runAction(internal.github.refreshRepositoriesForUser, {
    userId: args.userId,
    installationId: args.installationId,
  });
}

export const completeVerifiedAppInstallation = internalMutation({
  args: {
    userId: v.id("users"),
    githubUserId: v.string(),
    login: v.string(),
    avatarUrl: v.optional(v.string()),
    installationId: v.string(),
    installationAccountType: v.optional(v.string()),
    repositorySelection: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const current = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const patch = {
      authType: "github_app" as const,
      accessToken: undefined,
      installationId: args.installationId,
      installationAccountType: args.installationAccountType,
      repositorySelection: args.repositorySelection,
      githubUserId: args.githubUserId,
      login: args.login,
      avatarUrl: args.avatarUrl,
      updatedAt: now,
      revokedAt: undefined,
    };
    if (current) await ctx.db.patch(current._id, patch);
    else await ctx.db.insert("githubConnections", { userId: args.userId, ...patch, createdAt: now });

    const candidates = await ctx.db
      .query("githubAppAuthorizationCandidates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    await Promise.all(candidates.map((candidate) => ctx.db.delete(candidate._id)));
    return null;
  },
});

export const finalizeAppAuthorization = internalAction({
  args: { state: v.string(), code: v.string() },
  returns: v.object({ outcome: v.union(v.literal("connected"), v.literal("choose"), v.literal("install")), installUrl: v.optional(v.string()), returnTo: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const stateHash = await sha256Hex(args.state);
    const pending = await ctx.runQuery(internal.github.getAppAuthorizationState, { stateHash });
    if (!pending) throw new Error("This GitHub authorization link is invalid or expired");

    const clientId = process.env.GITHUB_APP_CLIENT_ID;
    const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("GitHub App user authorization is not configured yet");
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: args.code }),
    });
    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokenPayload?.access_token !== "string") {
      throw new Error(typeof tokenPayload?.error_description === "string" ? tokenPayload.error_description : "GitHub did not authorize this connection");
    }
    const userToken = tokenPayload.access_token;
    const [userResult, installationsResult] = await Promise.all([
      githubFetch(userToken, "/user"),
      githubFetch(userToken, "/user/installations"),
    ]);
    const user = userResult.payload as any;
    const appId = process.env.GITHUB_APP_ID;
    const installations = Array.isArray((installationsResult.payload as any)?.installations)
      ? (installationsResult.payload as any).installations
      : [];
    const eligible = installations.filter((installation: any) =>
      String(installation?.app_id || "") === String(appId || "") &&
      !installation?.suspended_at &&
      installation?.id !== undefined &&
      typeof installation?.account?.login === "string"
    );
    const githubUserId = user?.id !== undefined ? String(user.id) : "";
    const login = typeof user?.login === "string" ? user.login : "";
    if (!githubUserId || !login) throw new Error("GitHub did not return your account identity");
    await ctx.runMutation(internal.github.markAppAuthorizationStateUsed, { stateHash });

    if (eligible.length === 1) {
      const installation = eligible[0];
      await connectVerifiedInstallation(ctx, {
        userId: pending.userId,
        githubUserId,
        login,
        avatarUrl: typeof user?.avatar_url === "string" ? user.avatar_url : undefined,
        installationId: String(installation.id),
        installationAccountType: typeof installation?.target_type === "string" ? installation.target_type : undefined,
        repositorySelection: typeof installation?.repository_selection === "string" ? installation.repository_selection : undefined,
      });
      return { outcome: "connected" as const, returnTo: pending.returnTo };
    }

    if (eligible.length > 1) {
      await ctx.runMutation(internal.github.saveAppAuthorizationCandidates, {
        userId: pending.userId,
        candidates: eligible.map((installation: any) => ({
          githubUserId,
          githubLogin: login,
          githubAvatarUrl: typeof user?.avatar_url === "string" ? user.avatar_url : undefined,
          installationId: String(installation.id),
          installationLogin: installation.account.login,
          installationAvatarUrl: typeof installation.account.avatar_url === "string" ? installation.account.avatar_url : undefined,
          installationAccountType: typeof installation.target_type === "string" ? installation.target_type : undefined,
          repositorySelection: typeof installation.repository_selection === "string" ? installation.repository_selection : undefined,
        })),
      });
      return { outcome: "choose" as const, returnTo: pending.returnTo };
    }

    const appSlug = process.env.GITHUB_APP_SLUG;
    if (!appSlug) throw new Error("GitHub App is not configured yet");
    const installState = randomSecret("githubapp");
    await ctx.runMutation(internal.github.createAppInstallState, {
      userId: pending.userId,
      stateHash: await sha256Hex(installState),
      returnTo: pending.returnTo,
    });
    const installUrl = new URL(`https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`);
    installUrl.searchParams.set("state", installState);
    return { outcome: "install" as const, installUrl: installUrl.toString(), returnTo: pending.returnTo };
  },
});

export const selectAuthorizedInstallation = action({
  args: { installationId: v.string() },
  returns: v.object({ connected: v.boolean() }),
  handler: async (ctx, { installationId }) => {
    const userId = await requireUserId(ctx);
    const candidate = await ctx.runQuery(internal.github.getAuthorizationCandidate, { userId, installationId });
    if (!candidate) throw new Error("That GitHub installation is no longer available. Please connect GitHub again.");
    const installation = await githubAppFetch(`/app/installations/${encodeURIComponent(installationId)}`);
    if (installation?.suspended_at) throw new Error("That GitHub App installation is suspended");
    await connectVerifiedInstallation(ctx, {
      userId,
      githubUserId: candidate.githubUserId,
      login: candidate.login,
      avatarUrl: candidate.avatarUrl,
      installationId,
      installationAccountType: typeof installation?.target_type === "string" ? installation.target_type : candidate.installationAccountType,
      repositorySelection: typeof installation?.repository_selection === "string" ? installation.repository_selection : candidate.repositorySelection,
    });
    return { connected: true };
  },
});

export const getAuthorizationCandidate = internalQuery({
  args: { userId: v.id("users"), installationId: v.string() },
  handler: async (ctx, { userId, installationId }) => {
    const candidate = await ctx.db
      .query("githubAppAuthorizationCandidates")
      .withIndex("by_user_installation", (q) => q.eq("userId", userId).eq("installationId", installationId))
      .unique();
    if (!candidate || candidate.expiresAt < Date.now()) return null;
    return {
      githubUserId: candidate.githubUserId,
      login: candidate.githubLogin,
      avatarUrl: candidate.githubAvatarUrl,
      installationAccountType: candidate.installationAccountType,
      repositorySelection: candidate.repositorySelection,
    };
  },
});

export const getConnectionSecret = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!connection || connection.revokedAt) return null;
    return {
      accessToken: connection.accessToken,
      installationId: connection.installationId,
      authType: connection.authType ?? (connection.installationId ? "github_app" : "legacy_oauth"),
    };
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.object({ disconnected: v.boolean() }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    // Remove the credential immediately. Historical activity and goal links
    // remain as an audit trail, but no further GitHub requests can be made.
    if (connection) await ctx.db.delete(connection._id);
    return { disconnected: true };
  },
});

export const listRepositories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("githubRepositories").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

/**
 * Supplies safe, owned repository context to the new-goal wizard. The wizard
 * never trusts a repository name from the URL, so a user cannot attach a goal
 * to somebody else's GitHub repository by changing a query parameter.
 */
export const getRepositoryGoalDraft = query({
  args: { repositoryId: v.id("githubRepositories") },
  handler: async (ctx, { repositoryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.userId !== userId) return null;
    return {
      repositoryId: repository._id,
      name: repository.name,
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      defaultBranch: repository.defaultBranch ?? "default branch",
      suggestedTarget: 50,
      suggestedBackfillFrom: Date.now() - DEFAULT_BACKFILL_MS,
    };
  },
});

export const saveRepositories = internalMutation({
  args: {
    userId: v.id("users"),
    installationId: v.optional(v.string()),
    repositories: v.array(v.any()),
  },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;
    for (const row of args.repositories) {
      const githubRepositoryId = String(row.id || "");
      const fullName = typeof row.full_name === "string" ? row.full_name : "";
      if (!githubRepositoryId || !fullName || !fullName.includes("/")) continue;
      const [owner, name] = fullName.split("/");
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_user_repository", (q) => q.eq("userId", args.userId).eq("githubRepositoryId", githubRepositoryId))
        .unique();
      const value = {
        installationId: args.installationId,
        githubRepositoryId,
        fullName,
        owner,
        name,
        defaultBranch: typeof row.default_branch === "string" ? row.default_branch : undefined,
        private: Boolean(row.private),
        htmlUrl: typeof row.html_url === "string" ? row.html_url : `https://github.com/${fullName}`,
        archived: Boolean(row.archived),
        updatedAtGithub: dateNumber(row.updated_at),
        syncedAt: now,
      };
      if (existing) await ctx.db.patch(existing._id, value);
      else await ctx.db.insert("githubRepositories", { userId: args.userId, ...value });
      count += 1;
    }
    return { count };
  },
});

export const refreshRepositories = action({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.runAction(internal.github.refreshRepositoriesForUser, { userId });
  },
});

export const refreshRepositoriesForUser = internalAction({
  args: { userId: v.id("users"), installationId: v.optional(v.string()) },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, args) => {
    const userId = args.userId;
    const secret = await ctx.runQuery(internal.github.getConnectionSecret, { userId });
    if (!secret) throw new Error("Connect GitHub first");
    if (args.installationId && secret.installationId !== args.installationId) throw new Error("GitHub installation is no longer connected");
    const token = secret.installationId ? await installationAccessToken(secret.installationId) : secret.accessToken;
    if (!token) throw new Error("GitHub connection needs to be reinstalled");
    const repositories = secret.installationId
      ? await fetchPages(token, "/installation/repositories?per_page=100", 10)
      : await fetchPages(token, "/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&direction=desc&per_page=100", 10);
    return await ctx.runMutation(internal.github.saveRepositories, { userId, installationId: secret.installationId, repositories });
  },
});

export const getLinkIdsForWebhook = internalQuery({
  args: { installationId: v.string(), githubRepositoryId: v.string() },
  handler: async (ctx, args) => {
    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_github_repository", (q) => q.eq("githubRepositoryId", args.githubRepositoryId))
      .collect();
    const ids = [];
    for (const repository of repositories) {
      if (repository.installationId !== args.installationId) continue;
      const links = await ctx.db
        .query("githubGoalLinks")
        .withIndex("by_repository", (q) => q.eq("repositoryId", repository._id))
        .collect();
      ids.push(...links.map((link) => link._id));
    }
    return ids;
  },
});

export const getUserForInstallation = internalQuery({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) => q.eq("installationId", installationId))
      .unique();
    return connection && !connection.revokedAt ? { userId: connection.userId } : null;
  },
});

export const setInstallationAvailability = internalMutation({
  args: { installationId: v.string(), revoked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) => q.eq("installationId", args.installationId))
      .unique();
    if (connection) await ctx.db.patch(connection._id, { revokedAt: args.revoked ? Date.now() : undefined, updatedAt: Date.now() });
    return null;
  },
});

export const handleWebhook = internalAction({
  args: { event: v.string(), payload: v.any() },
  returns: v.null(),
  handler: async (ctx, { event, payload }) => {
    const installationId = payload?.installation?.id !== undefined ? String(payload.installation.id) : "";
    if (!installationId) return null;
    if (event === "installation") {
      const actionName = typeof payload?.action === "string" ? payload.action : "";
      if (actionName === "deleted" || actionName === "suspend") {
        await ctx.runMutation(internal.github.setInstallationAvailability, { installationId, revoked: true });
      } else if (actionName === "unsuspend") {
        await ctx.runMutation(internal.github.setInstallationAvailability, { installationId, revoked: false });
      }
      return null;
    }
    const connection = await ctx.runQuery(internal.github.getUserForInstallation, { installationId });
    if (!connection) return null;
    if (event === "installation_repositories") {
      await ctx.runAction(internal.github.refreshRepositoriesForUser, { userId: connection.userId, installationId });
      return null;
    }
    const repositoryId = payload?.repository?.id !== undefined ? String(payload.repository.id) : "";
    if (!repositoryId || (event === "pull_request" && payload?.pull_request?.merged !== true)) return null;
    const links = await ctx.runQuery(internal.github.getLinkIdsForWebhook, { installationId, githubRepositoryId: repositoryId });
    for (const linkId of links.slice(0, 25)) {
      try {
        await ctx.runAction(internal.github.syncLinkInternal, { linkId });
      } catch (error) {
        console.error("[github] webhook sync failed", { linkId, error });
      }
    }
    return null;
  },
});

export const listGoalLinks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const links = await ctx.db.query("githubGoalLinks").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const rows = [];
    for (const link of links) {
      const [goal, repository] = await Promise.all([ctx.db.get(link.goalId), ctx.db.get(link.repositoryId)]);
      if (!goal || !repository) continue;
      const activities = await ctx.db
        .query("githubActivities")
        .withIndex("by_link_event", (q) => q.eq("linkId", link._id))
        .collect();
      rows.push({
        id: link._id,
        goalId: link.goalId,
        goalTitle: goal.title,
        repository: repository.fullName,
        repositoryUrl: repository.htmlUrl,
        activityKind: link.activityKind,
        progressMode: link.progressMode,
        backfillFrom: link.backfillFrom ?? null,
        lastSyncedAt: link.lastSyncedAt ?? null,
        activityCount: activities.length,
      });
    }
    return rows;
  },
});

/** A compact GitHub delivery signal for an existing goal's owner workspace. */
export const getGoalIntegration = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const links = await ctx.db
      .query("githubGoalLinks")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const rows = [];
    for (const link of links) {
      const [repository, activities] = await Promise.all([
        ctx.db.get(link.repositoryId),
        ctx.db.query("githubActivities").withIndex("by_link_event", (q) => q.eq("linkId", link._id)).collect(),
      ]);
      if (!repository) continue;
      rows.push({
        linkId: link._id,
        repository: repository.fullName,
        repositoryUrl: repository.htmlUrl,
        activityKind: link.activityKind,
        progressMode: link.progressMode,
        activityCount: activities.length,
        backfillFrom: link.backfillFrom ?? null,
        lastSyncedAt: link.lastSyncedAt ?? null,
      });
    }
    return {
      connected: Boolean(connection && !connection.revokedAt),
      primaryMetricIsGitHub: isProgressCompatible(goal, "commits") || isProgressCompatible(goal, "merged_prs"),
      progressActivityKind: isProgressCompatible(goal, "commits")
        ? "commits"
        : isProgressCompatible(goal, "merged_prs")
        ? "merged_prs"
        : null,
      primaryMetricLabel: `${goal.currentValue ?? 0} / ${goal.targetValue} ${goal.unit}`,
      links: rows,
    };
  },
});

/**
 * The readable work history for a single goal. GitHub remains the source of
 * truth; this is the owned, immutable activity ledger shown in GoMotivateMe.
 */
export const listGoalActivity = query({
  args: { goalId: v.id("goals"), limit: v.optional(v.number()) },
  handler: async (ctx, { goalId, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const [links, activities, summaries] = await Promise.all([
      ctx.db.query("githubGoalLinks").withIndex("by_goal", (q) => q.eq("goalId", goalId)).collect(),
      ctx.db
        .query("githubActivities")
        .withIndex("by_goal_occurred", (q) => q.eq("goalId", goalId))
        .order("desc")
        .take(Math.max(1, Math.min(limit ?? 60, 100))),
      ctx.db
        .query("githubSummaries")
        .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
        .order("desc")
        .take(100),
    ]);
    const repositoryByLink = new Map<string, { fullName: string; htmlUrl: string }>();
    for (const link of links) {
      const repository = await ctx.db.get(link.repositoryId);
      if (repository) repositoryByLink.set(String(link._id), { fullName: repository.fullName, htmlUrl: repository.htmlUrl });
    }
    return {
      links: links.map((link) => ({ id: link._id, lastSyncedAt: link.lastSyncedAt ?? null })),
      activities: activities.map((activity) => ({
        id: activity._id,
        kind: activity.kind,
        title: activity.title,
        summary: activity.rawSummary ?? null,
        url: activity.url,
        authorLogin: activity.authorLogin ?? null,
        occurredAt: activity.occurredAt,
        repository: repositoryByLink.get(String(activity.linkId))?.fullName ?? "Linked repository",
        repositoryUrl: repositoryByLink.get(String(activity.linkId))?.htmlUrl ?? null,
      })),
      dailySummaries: summaries.map((summary) => {
        const day = new Date(summary.periodStart).toISOString().slice(0, 10);
        const dayRows = activities.filter((activity) => activity.occurredAt >= summary.periodStart && activity.occurredAt < summary.periodEnd);
        const isLegacyDailyList = summary.periodEnd - summary.periodStart === DAY_MS && summary.content.includes(" · ");
        return {
        content: isLegacyDailyList && dayRows.length > 0 ? dailySummaryParagraph(dayRows) : summary.content,
        activityCount: summary.activityCount,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        createdAt: summary.createdAt,
        };
      }),
      latestSummary: summaries[0]
        ? {
            content: summaries[0].content,
            activityCount: summaries[0].activityCount,
            periodStart: summaries[0].periodStart,
            periodEnd: summaries[0].periodEnd,
            createdAt: summaries[0].createdAt,
          }
        : null,
    };
  },
});

export const createGoalLink = mutation({
  args: {
    goalId: v.id("goals"),
    repositoryId: v.id("githubRepositories"),
    branch: v.optional(v.string()),
    activityKind: activityKindValidator,
    progressMode: progressModeValidator,
    countBackfilledProgress: v.optional(v.boolean()),
    autoComplete: v.optional(v.boolean()),
    backfillFrom: v.optional(v.number()),
  },
  returns: v.object({ linkId: v.id("githubGoalLinks") }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const [goal, repository, connection] = await Promise.all([
      ctx.db.get(args.goalId),
      ctx.db.get(args.repositoryId),
      ctx.db.query("githubConnections").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    ]);
    if (!connection || connection.revokedAt) throw new Error("Connect GitHub first");
    if (!goal || goal.ownerId !== userId) throw new Error("Goal not found");
    if (!repository || repository.userId !== userId) throw new Error("Repository not found");
    if (args.progressMode === "progress" && !isProgressCompatible(goal, args.activityKind)) {
      throw new Error("Automatic progress requires an increasing GitHub commits or merged pull requests measurement. Use activity-only for this existing goal.");
    }
    if (args.backfillFrom && (!Number.isFinite(args.backfillFrom) || args.backfillFrom > Date.now())) {
      throw new Error("Backfill start must be a date in the past");
    }
    const duplicates = await ctx.db
      .query("githubGoalLinks")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
    const existing = duplicates.find((row) => row.repositoryId === args.repositoryId);
    const now = Date.now();
    const value = {
      branch: args.branch?.trim() || repository.defaultBranch,
      activityKind: args.activityKind,
      progressMode: args.progressMode,
      // Backfill is always preserved as dated evidence. A new GitHub goal
      // defaults to starting fresh, so historic commits do not make a just
      // created 50-commit goal appear complete on day one.
      progressFrom: args.progressMode === "progress" && args.countBackfilledProgress === false ? now : undefined,
      autoComplete: args.autoComplete ?? false,
      backfillFrom: args.backfillFrom ?? now - DEFAULT_BACKFILL_MS,
      lastSyncedAt: undefined,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return { linkId: existing._id };
    }
    const linkId = await ctx.db.insert("githubGoalLinks", {
      userId,
      goalId: args.goalId,
      repositoryId: args.repositoryId,
      ...value,
      createdAt: now,
    });
    return { linkId };
  },
});

export const deleteGoalLink = mutation({
  args: { linkId: v.id("githubGoalLinks") },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { linkId }) => {
    const userId = await requireUserId(ctx);
    const link = await ctx.db.get(linkId);
    if (!link || link.userId !== userId) throw new Error("GitHub goal link not found");
    await ctx.db.delete(linkId);
    return { deleted: true };
  },
});

export const getLinkForSync = internalQuery({
  args: { linkId: v.id("githubGoalLinks") },
  handler: async (ctx, { linkId }) => {
    const link = await ctx.db.get(linkId);
    if (!link) return null;
    const [repository, goal, connection] = await Promise.all([
      ctx.db.get(link.repositoryId),
      ctx.db.get(link.goalId),
      ctx.db.query("githubConnections").withIndex("by_user", (q) => q.eq("userId", link.userId)).unique(),
    ]);
    if (!repository || !goal || !connection || connection.revokedAt) return null;
    return {
      link,
      repository,
      goal,
      accessToken: connection.accessToken,
      installationId: connection.installationId,
    };
  },
});

export const getOwnedLink = internalQuery({
  args: { userId: v.id("users"), linkId: v.id("githubGoalLinks") },
  handler: async (ctx, { userId, linkId }) => {
    const link = await ctx.db.get(linkId);
    return link && link.userId === userId ? { ok: true } : null;
  },
});

export const getOwnedGoalLinkIds = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals") },
  handler: async (ctx, { userId, goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return (await ctx.db.query("githubGoalLinks").withIndex("by_goal", (q) => q.eq("goalId", goalId)).collect())
      .filter((link) => link.userId === userId)
      .map((link) => link._id);
  },
});

export const upsertActivities = internalMutation({
  args: { linkId: v.id("githubGoalLinks"), events: v.array(v.any()) },
  returns: v.object({ imported: v.number(), currentValue: v.union(v.number(), v.null()), completed: v.boolean() }),
  handler: async (ctx, { linkId, events }) => {
    const link = await ctx.db.get(linkId);
    if (!link) throw new Error("GitHub goal link not found");
    const goal = await ctx.db.get(link.goalId);
    if (!goal) throw new Error("Goal not found");
    const now = Date.now();
    let imported = 0;
    const importedDays = new Set<string>();
    for (const event of events as GithubEvent[]) {
      const existing = await ctx.db
        .query("githubActivities")
        .withIndex("by_link_event", (q) => q.eq("linkId", linkId).eq("eventKey", event.eventKey))
        .unique();
      if (existing) continue;
      await ctx.db.insert("githubActivities", {
        userId: link.userId,
        goalId: link.goalId,
        linkId,
        eventKey: event.eventKey,
        kind: event.kind,
        title: compactTitle(event.title, event.kind === "commit" ? "GitHub commit" : "Merged pull request"),
        url: event.url,
        authorLogin: event.authorLogin,
        occurredAt: event.occurredAt,
        rawSummary: event.rawSummary?.slice(0, 1_000),
        importedAt: now,
      });
      imported += 1;
      importedDays.add(new Date(event.occurredAt).toISOString().slice(0, 10));
    }
    await ctx.db.patch(linkId, { lastSyncedAt: now, updatedAt: now });

    const goalLinks = await ctx.db.query("githubGoalLinks").withIndex("by_goal", (q) => q.eq("goalId", link.goalId)).collect();
    const progressLinks = goalLinks.filter((row) => row.progressMode === "progress");
    let currentValue: number | null = null;
    let completed = goal.status === "completed";
    if (progressLinks.length > 0 && isProgressCompatible(goal, progressLinks[0].activityKind)) {
      const progressLinkIds = new Set(progressLinks.map((row) => String(row._id)));
      const activities = await ctx.db
        .query("githubActivities")
        .withIndex("by_goal_occurred", (q) => q.eq("goalId", link.goalId))
        .collect();
      const progressFromByLink = new Map(progressLinks.map((row) => [String(row._id), row.progressFrom]));
      const count = activities.filter((row) => {
        if (!progressLinkIds.has(String(row.linkId))) return false;
        const progressFrom = progressFromByLink.get(String(row.linkId));
        return !progressFrom || row.occurredAt >= progressFrom;
      }).length;
      currentValue = (goal.startValue ?? 0) + count;
      const patch: Record<string, unknown> = {
        currentValue,
        updatedAt: now,
        lastStaleReminderAt: undefined,
      };
      const autoComplete = progressLinks.some((row) => row.autoComplete);
      if (autoComplete && currentValue >= goal.targetValue && goal.status !== "completed") {
        patch.status = "completed";
        patch.completedAt = now;
        completed = true;
      }
      await ctx.db.patch(goal._id, patch);
    }
    // AIBL receives dated daily facts, not individual commits. This keeps the
    // campaign readable while preserving an accurate backfill by day.
    if (importedDays.size > 0) {
      const allLinkActivity = await ctx.db
        .query("githubActivities")
        .withIndex("by_link_event", (q) => q.eq("linkId", linkId))
        .collect();
      for (const day of importedDays) {
        const dayRows = allLinkActivity.filter((row) => new Date(row.occurredAt).toISOString().slice(0, 10) === day);
        const commitCount = dayRows.filter((row) => row.kind === "commit").length;
        const prCount = dayRows.filter((row) => row.kind === "merged_pr").length;
        const parts = [commitCount ? `${commitCount} commit${commitCount === 1 ? "" : "s"}` : "", prCount ? `${prCount} merged PR${prCount === 1 ? "" : "s"}` : ""].filter(Boolean);
        await ctx.scheduler.runAfter(0, internal.partnerPush.pushUpdateToAiblInternal, {
          userId: link.userId,
          goalId: link.goalId,
          gmmKey: `github-day:${day}`,
          title: `GitHub: ${parts.join(" and ") || "activity"}`,
          description: dayRows.slice(0, 4).map((row) => row.title).join(" · "),
          date: day,
          completed: true,
        });
      }
    }
    return { imported, currentValue, completed };
  },
});

async function collectEvents(bundle: any): Promise<GithubEvent[]> {
  const { link, repository } = bundle;
  const accessToken = bundle.installationId ? await installationAccessToken(bundle.installationId) : bundle.accessToken;
  if (!accessToken) throw new Error("GitHub connection needs to be reinstalled");
  const from = link.lastSyncedAt
    ? Math.max(0, link.lastSyncedAt - 15 * 60_000)
    : link.backfillFrom ?? Date.now() - DEFAULT_BACKFILL_MS;
  const since = new Date(from).toISOString();
  const branch = link.branch || repository.defaultBranch;
  const root = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
  const events: GithubEvent[] = [];
  if (link.activityKind === "commits" || link.activityKind === "both") {
    const params = new URLSearchParams({ since, per_page: "100" });
    if (branch) params.set("sha", branch);
    const commits = await fetchPages(accessToken, `${root}/commits?${params.toString()}`);
    for (const row of commits) {
      const sha = typeof row?.sha === "string" ? row.sha : "";
      if (!sha) continue;
      const message = typeof row?.commit?.message === "string" ? row.commit.message : "GitHub commit";
      events.push({
        eventKey: `commit:${sha}`,
        kind: "commit",
        title: compactTitle(message.split("\n")[0], "GitHub commit"),
        url: typeof row?.html_url === "string" ? row.html_url : `${repository.htmlUrl}/commit/${sha}`,
        authorLogin: typeof row?.author?.login === "string" ? row.author.login : undefined,
        occurredAt: dateNumber(row?.commit?.author?.date || row?.commit?.committer?.date),
        rawSummary: compactTitle(message, "GitHub commit"),
      });
    }
  }
  if (link.activityKind === "merged_prs" || link.activityKind === "both") {
    const pulls = await fetchPages(accessToken, `${root}/pulls?state=closed&sort=updated&direction=desc&per_page=100`);
    for (const row of pulls) {
      const mergedAt = dateNumber(row?.merged_at);
      if (!row?.merged_at || mergedAt < from) continue;
      const number = Number(row?.number);
      if (!Number.isFinite(number)) continue;
      events.push({
        eventKey: `pr:${number}`,
        kind: "merged_pr",
        title: compactTitle(row?.title, `Merged pull request #${number}`),
        url: typeof row?.html_url === "string" ? row.html_url : `${repository.htmlUrl}/pull/${number}`,
        authorLogin: typeof row?.user?.login === "string" ? row.user.login : undefined,
        occurredAt: mergedAt,
        rawSummary: compactTitle(row?.body, "Merged pull request"),
      });
    }
  }
  return events.sort((a, b) => a.occurredAt - b.occurredAt);
}

export const syncLinkInternal = internalAction({
  args: { linkId: v.id("githubGoalLinks") },
  returns: v.object({ imported: v.number(), currentValue: v.union(v.number(), v.null()), completed: v.boolean() }),
  handler: async (ctx, { linkId }) => {
    const bundle = await ctx.runQuery(internal.github.getLinkForSync, { linkId });
    if (!bundle) throw new Error("GitHub connection or goal link is unavailable");
    const events = await collectEvents(bundle);
    return await ctx.runMutation(internal.github.upsertActivities, { linkId, events });
  },
});

export const syncLink = action({
  args: { linkId: v.id("githubGoalLinks") },
  returns: v.object({ imported: v.number(), currentValue: v.union(v.number(), v.null()), completed: v.boolean() }),
  handler: async (ctx, { linkId }) => {
    const userId = await requireUserId(ctx);
    const owned = await ctx.runQuery(internal.github.getOwnedLink, { userId, linkId });
    if (!owned) throw new Error("GitHub goal link not found");
    return await ctx.runAction(internal.github.syncLinkInternal, { linkId });
  },
});

/** Lets a goal owner pull new work without waiting for the hourly sync. */
export const syncGoal = action({
  args: { goalId: v.id("goals") },
  returns: v.object({ linksSynced: v.number(), imported: v.number() }),
  handler: async (ctx, { goalId }) => {
    const userId = await requireUserId(ctx);
    const linkIds = await ctx.runQuery(internal.github.getOwnedGoalLinkIds, { userId, goalId });
    if (linkIds.length === 0) throw new Error("No GitHub repositories are linked to this goal");
    let imported = 0;
    for (const linkId of linkIds) {
      const result = await ctx.runAction(internal.github.syncLinkInternal, { linkId });
      imported += result.imported;
    }
    return { linksSynced: linkIds.length, imported };
  },
});

export const getAllLinkIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("githubGoalLinks").collect()).map((link) => link._id),
});

export const syncAll = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const links = await ctx.runQuery(internal.github.getAllLinkIds, {});
    for (const linkId of links.slice(0, 100)) {
      try {
        await ctx.runAction(internal.github.syncLinkInternal, { linkId });
      } catch (error) {
        console.error("[github] scheduled sync failed", { linkId, error });
      }
    }
    return null;
  },
});

export const getGoalDigest = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals"), days: v.optional(v.number()) },
  handler: async (ctx, { userId, goalId, days }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const end = Date.now();
    const start = end - Math.max(1, Math.min(days ?? 7, 365)) * DAY_MS;
    const activities = await ctx.db
      .query("githubActivities")
      .withIndex("by_goal_occurred", (q) => q.eq("goalId", goalId).gte("occurredAt", start))
      .collect();
    return { goal, start, end, activities };
  },
});

export const saveSummary = internalMutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    periodStart: v.number(),
    periodEnd: v.number(),
    content: v.string(),
    activityCount: v.number(),
  },
  returns: v.object({ id: v.id("githubSummaries") }),
  handler: async (ctx, args) => ({ id: await ctx.db.insert("githubSummaries", { ...args, createdAt: Date.now() }) }),
});

export const summarizeGoal = action({
  args: { goalId: v.id("goals"), days: v.optional(v.number()) },
  returns: v.object({ content: v.string(), activityCount: v.number() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const digest = await ctx.runQuery(internal.github.getGoalDigest, { userId, goalId: args.goalId, days: args.days });
    if (!digest) throw new Error("Goal not found");
    const commits = digest.activities.filter((row: any) => row.kind === "commit");
    const prs = digest.activities.filter((row: any) => row.kind === "merged_pr");
    const fallback = `${commits.length} commit${commits.length === 1 ? "" : "s"} and ${prs.length} merged pull request${prs.length === 1 ? "" : "s"} were verified for this goal. ${digest.activities.slice(-3).map((row: any) => row.title).join(" · ")}`.trim();
    let content = fallback || "No GitHub activity was recorded for this period.";
    if (process.env.OPENAI_API_KEY && digest.activities.length > 0) {
      const facts = digest.activities.slice(-80).map((row: any) => ({ type: row.kind, date: new Date(row.occurredAt).toISOString().slice(0, 10), title: row.title })).reverse();
      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.GITHUB_SUMMARY_MODEL || "gpt-5.6-luna",
            input: `Write a concise, factual weekly progress recap for the goal \"${digest.goal.title}\". Use only these verified GitHub facts. Do not claim outcomes not present. Mention counts and 2-4 meaningful changes. Facts: ${JSON.stringify(facts)}`,
            max_output_tokens: 260,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        const output = typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
        if (response.ok && output) content = output.slice(0, 2_000);
      } catch (error) {
        console.error("[github] AI summary fallback", error);
      }
    }
    await ctx.runMutation(internal.github.saveSummary, {
      userId,
      goalId: args.goalId,
      periodStart: digest.start,
      periodEnd: digest.end,
      content,
      activityCount: digest.activities.length,
    });
    return { content, activityCount: digest.activities.length };
  },
});

export const getGoalDayDigest = internalQuery({
  args: { userId: v.id("users"), goalId: v.id("goals"), day: v.string() },
  handler: async (ctx, { userId, goalId, day }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return null;
    const start = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(start)) throw new Error("Invalid summary date");
    const end = start + DAY_MS;
    const activities = await ctx.db
      .query("githubActivities")
      .withIndex("by_goal_occurred", (q) => q.eq("goalId", goalId).gte("occurredAt", start).lt("occurredAt", end))
      .collect();
    return { goal, start, end, activities };
  },
});

export const summarizeGoalDay = action({
  args: { goalId: v.id("goals"), day: v.string() },
  returns: v.object({ content: v.string(), activityCount: v.number(), day: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const digest = await ctx.runQuery(internal.github.getGoalDayDigest, { userId, goalId: args.goalId, day: args.day });
    if (!digest) throw new Error("Goal not found");
    const fallback = dailySummaryParagraph(digest.activities);
    let content = fallback || "No GitHub activity was recorded for this day.";
    if (process.env.OPENAI_API_KEY && digest.activities.length > 0) {
      const facts = digest.activities.map((row: any) => ({ type: row.kind, title: row.title }));
      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.GITHUB_SUMMARY_MODEL || "gpt-5.6-luna",
            input: `Write one concise, factual paragraph summarising the meaningful work completed for the goal "${digest.goal.title}". Use only these verified GitHub facts. Do not mention the date, commit counts, pull-request counts, event types, or technical tracking language because those are already shown separately in the timeline. Do not use bullets, headings, fragments, or a raw title list. Start with "The work focused on" and describe the changes in plain language. Do not claim outcomes not present. Facts: ${JSON.stringify(facts)}`,
            max_output_tokens: 220,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        const output = typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
        if (response.ok && output) content = output.slice(0, 2_000);
      } catch (error) {
        console.error("[github] daily AI summary fallback", error);
      }
    }
    await ctx.runMutation(internal.github.saveSummary, {
      userId,
      goalId: args.goalId,
      periodStart: digest.start,
      periodEnd: digest.end,
      content,
      activityCount: digest.activities.length,
    });
    return { content, activityCount: digest.activities.length, day: args.day };
  },
});
