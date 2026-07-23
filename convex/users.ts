// @ts-nocheck — see convex/goals.ts header.
/**
 * User-facing queries + handle management.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { HANDLE_RE, MIN_HANDLE_LENGTH, MAX_HANDLE_LENGTH } from "../lib/handle";

/** Server-side: raw user lookup by email (for auth email flows). */
export const getRawByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first(),
});

/** Current user profile. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: (user as { name?: string }).name ?? null,
      email: (user as { email?: string }).email ?? null,
      image: (user as { image?: string }).image ?? null,
      handle: (user as { handle?: string }).handle ?? null,
      handleChangesRemaining: (user as { handleChangesRemaining?: number }).handleChangesRemaining ?? null,
      bio: (user as { bio?: string }).bio ?? null,
      coverImageId: (user as { coverImageId?: string }).coverImageId ?? null,
      isAdmin: (user as { isAdmin?: boolean }).isAdmin ?? false,
    };
  },
});

/** Batch fetch of public profiles by id. */
export const profilesById = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, { ids }) => {
    const out: Record<string, { _id: string; name: string | null; image: string | null; handle: string | null }> = {};
    await Promise.all(
      ids.map(async (id) => {
        const u = await ctx.db.get(id);
        if (!u) return;
        out[id] = {
          _id: id,
          name: (u as { name?: string }).name ?? null,
          image: (u as { image?: string }).image ?? null,
          handle: (u as { handle?: string }).handle ?? null,
        };
      })
    );
    return out;
  },
});

/**
 * Public profile lookup by handle. Used by /u/[handle]. Returns null if
 * the user doesn't exist or hasn't set a handle yet. Does NOT include
 * email — that's private.
 */
export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const normalized = handle.toLowerCase().trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      name: (user as { name?: string }).name ?? null,
      image: (user as { image?: string }).image ?? null,
      handle: (user as { handle?: string }).handle ?? null,
      bio: (user as { bio?: string }).bio ?? null,
      coverImageId: (user as { coverImageId?: string }).coverImageId ?? null,
    };
  },
});

/**
 * Combined view used by the public profile page: the user + their goal
 * counts + their motivation count + a list of recent public goals +
 * recent motivations. All denormalized for one round-trip.
 */
export const profileSummary = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const normalized = handle.toLowerCase().trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
    if (!user) return null;

    const userId = user._id;

    // Goals owned by this user (only public, active or completed)
    const ownedGoals = await ctx.db
      .query("goals")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const publicGoals = ownedGoals
      .filter(
        (g) =>
          g.visibility === "public" &&
          (g.status === "active" ||
            g.status === "completed" ||
            g.status === "paused")
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    // Goals this user is motivating
    const allPledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    // For each motivation, fetch the goal for the public card data.
    const motivationsWithGoal = await Promise.all(
      allPledges.slice(0, 12).map(async (p) => {
        const g = await ctx.db.get(p.goalId);
        if (!g || g.visibility !== "public" || g.status === "draft") {
          return null;
        }
        return {
          _id: p._id,
          role: p.role,
          checkInFrequency: p.checkInFrequency,
          pledgeText: p.pledgeText ?? null,
          isCoreMotivator: p.isCoreMotivator,
          acceptedAt: p.acceptedAt,
          goal: {
            _id: g._id,
            slug: g.slug,
            title: g.title,
            summary: g.summary ?? null,
            category: g.category,
            coverImageId: g.coverImageId ?? null,
            currentValue: g.currentValue,
            targetValue: g.targetValue,
            unit: g.unit,
            direction: g.direction,
            ownerName: g.ownerName,
            ownerImage: g.ownerImage ?? null,
          },
        };
      })
    );

    // Counters: total supporters across this user's goals (denormalized
    // for cheap reads). Just sum the supporterCount field on the goals.
    const totalSupporters = publicGoals.reduce(
      (sum, g) => sum + (g.supporterCount ?? 0),
      0
    );

    return {
      user: {
        _id: user._id,
        name: (user as { name?: string }).name ?? null,
        image: (user as { image?: string }).image ?? null,
        handle: (user as { handle?: string }).handle ?? null,
        bio: (user as { bio?: string }).bio ?? null,
        coverImageId: (user as { coverImageId?: string }).coverImageId ?? null,
      },
      stats: {
        goalsCount: publicGoals.length,
        motivatingCount: allPledges.length,
        supportersCount: totalSupporters,
      },
      goals: publicGoals.slice(0, 12),
      motivations: motivationsWithGoal.filter((m) => m !== null),
    };
  },
});

/**
 * Storage upload URL for the cover photo on the profile page. Returns
 * a one-time URL the client posts the image to.
 */
export const generateCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Set the freshly-uploaded cover image as the user's cover. Called after
 * the client POSTs the file to the URL from generateCoverUploadUrl.
 */
export const setCoverImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.db.patch(userId, { coverImageId: storageId });
    return { ok: true };
  },
});

/** Clear the cover image. */
export const removeCoverImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.db.patch(userId, { coverImageId: undefined });
    return { ok: true };
  },
});

/**
 * Set the freshly-uploaded avatar as the user's image. Called after the
 * client POSTs the file to the URL from generateCoverUploadUrl. Resolves
 * the storageId to a public URL server-side and stores it on the user
 * record (the @convex-dev/auth `image` field — same one used by the
 * profile avatar and the Convex auth session).
 */
export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Upload not found");
    await ctx.db.patch(userId, { image: url });
    return { ok: true, url };
  },
});

/** Clear the avatar image (falls back to initials on the profile). */
export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.db.patch(userId, { image: undefined });
    return { ok: true };
  },
});

/**
 * Update the user's profile fields. Each is optional — only the ones
 * provided are patched. Handle is normalized to lowercase + validated
 * against the HANDLE_RE.
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length === 0) throw new Error("Name can't be empty");
      if (trimmed.length > 80) throw new Error("Name is too long (max 80 chars)");
      patch.name = trimmed;
    }
    if (args.bio !== undefined) {
      const trimmed = args.bio.trim();
      if (trimmed.length > 280) throw new Error("Bio is too long (max 280 chars)");
      patch.bio = trimmed || undefined;
    }
    if (args.image !== undefined) {
      patch.image = args.image.trim() || undefined;
    }
    if (Object.keys(patch).length === 0) return { ok: true, changed: 0 };

    // Detect first-time profile setup (user had no name before) to fire the
    // welcome email once, and mint an unsubscribe token if none exists yet.
    const before = await ctx.db.get(userId);
    const isFirstSetup = !before?.name && patch.name !== undefined;

    if (!before?.unsubscribeToken) {
      patch.unsubscribeToken =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    await ctx.db.patch(userId, patch);

    // Email A1 — Welcome (transactional, fires once on first profile setup).
    if (isFirstSetup && before?.email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId,
        toEmail: before.email,
        templateId: "welcome",
        category: "transactional",
        payload: JSON.stringify({ firstName: (patch.name as string)?.split(" ")[0] }),
      });
    }

    return { ok: true, changed: Object.keys(patch).length };
  },
});

/**
 * Set or update the user's public handle.
 *
 * Policy:
 *  - First set (user has no handle yet): always allowed. Grants
 *    handleChangesRemaining = 1 for one future change. Signup path.
 *  - Change (user already has a handle): allowed only while
 *    handleChangesRemaining > 0; decrements on success. Existing users
 *    with no counter are treated as locked (undefined -> 0).
 */
export const setHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const normalized = handle.toLowerCase().trim();
    if (!HANDLE_RE.test(normalized)) {
      throw new Error(
        `Handle must be ${MIN_HANDLE_LENGTH}-${MAX_HANDLE_LENGTH} chars: lowercase letters, digits, _ or -`
      );
    }
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Not signed in");

    const isFirstSet = !(user as { handle?: string }).handle;

    // Change branch: enforce the one-change limit.
    if (!isFirstSet) {
      const remaining = (user as { handleChangesRemaining?: number }).handleChangesRemaining ?? 0;
      if (remaining <= 0) {
        throw new Error("Your handle is locked. Contact support to request a change.");
      }
    }

    // Check for a clash against any OTHER user with the same handle.
    const clash = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
    if (clash && clash._id !== userId) {
      throw new Error("That handle is taken");
    }

    if (isFirstSet) {
      await ctx.db.patch(userId, { handle: normalized, handleChangesRemaining: 1 });
    } else {
      const remaining = (user as { handleChangesRemaining?: number }).handleChangesRemaining ?? 1;
      await ctx.db.patch(userId, {
        handle: normalized,
        handleChangesRemaining: Math.max(0, remaining - 1),
      });
    }
    return { handle: normalized };
  },
});

/**
 * Discover: "Featured motivators" — users with the most visible activity
 * on the platform. Score = public goals owned + active motivatorships
 * + total supporters across their goals. Excludes anonymous / system
 * accounts (no handle AND no name) so the grid is meaningful.
 */
export const listFeaturedMotivators = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 12;

    // Pass 1: walk all public non-draft, non-closed goals and tally per user.
    const publicGoals = await ctx.db
      .query("goals")
      .withIndex("by_public_created", (q) => q.eq("visibility", "public"))
      .collect();

    type Agg = {
      _id: string;
      name: string | null;
      handle: string | null;
      image: string | null;
      bio: string | null;
      goalsCount: number;
      motivatingCount: number;
      supportersCount: number;
      latestActivityAt: number;
    };
    const byUser = new Map<string, Agg>();

    for (const g of publicGoals) {
      if (g.status === "draft" || g.status === "closed") continue;
      const u = await ctx.db.get(g.ownerId);
      if (!u) continue;
      const uu = u as { name?: string; handle?: string; image?: string; bio?: string };
      const existing = byUser.get(g.ownerId) ?? {
        _id: g.ownerId,
        name: uu.name ?? null,
        handle: uu.handle ?? null,
        image: uu.image ?? null,
        bio: uu.bio ?? null,
        goalsCount: 0,
        motivatingCount: 0,
        supportersCount: 0,
        latestActivityAt: 0,
      };
      existing.goalsCount += 1;
      existing.supportersCount += g.supporterCount ?? 0;
      existing.latestActivityAt = Math.max(existing.latestActivityAt, g.createdAt);
      byUser.set(g.ownerId, existing);
    }

    // Pass 2: walk all active motivator pledges and add to the count.
    // `by_goal_status` starts with goalId, so it cannot serve a status-only
    // lookup. This is a small discovery aggregation; collect then filter
    // until a dedicated status index is warranted.
    const pledges = (await ctx.db.query("motivatorPledges").collect()).filter(
      (pledge) => pledge.status === "active"
    );
    for (const p of pledges) {
      const u = await ctx.db.get(p.userId);
      if (!u) continue;
      const uu = u as { name?: string; handle?: string; image?: string; bio?: string };
      const existing = byUser.get(p.userId) ?? {
        _id: p.userId,
        name: uu.name ?? null,
        handle: uu.handle ?? null,
        image: uu.image ?? null,
        bio: uu.bio ?? null,
        goalsCount: 0,
        motivatingCount: 0,
        supportersCount: 0,
        latestActivityAt: 0,
      };
      existing.motivatingCount += 1;
      existing.latestActivityAt = Math.max(existing.latestActivityAt, p.acceptedAt);
      byUser.set(p.userId, existing);
    }

    // Filter anonymous / system users (no name AND no handle) — they
    // contribute no useful discover card.
    const candidates = Array.from(byUser.values()).filter(
      (u) => (u.handle ?? u.name) && (u.goalsCount + u.motivatingCount) > 0
    );

    // Sort: composite score, with latest-activity as the tiebreaker so the
    // grid stays fresh.
    candidates.sort((a, b) => {
      const scoreA = a.goalsCount * 3 + a.motivatingCount + a.supportersCount * 0.05;
      const scoreB = b.goalsCount * 3 + b.motivatingCount + b.supportersCount * 0.05;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.latestActivityAt - a.latestActivityAt;
    });

    return candidates.slice(0, take);
  },
});

/**
 * Permanently delete the signed-in user's account and all associated data.
 *
 * GDPR Art. 17 (right to erasure). Purges the user across every table:
 *  - Owned content: their goals (+ full cascade: updates, media, reactions,
 *    supporters, messages, badges, motivator circle tables, checkIns)
 *  - Dual-role rows: where they appear on OTHER people's goals (memberships,
 *    messages, pledges, applications, received invites, check-ins)
 *  - Notification prefs + email log (also scrubs rows by email address)
 *  - Auth tables: sessions, accounts, refresh tokens, verification codes
 *  - Storage files: cover photo
 *  - The user row itself (last)
 *
 * Storage cleanup pattern reuses goals.remove (goals.ts:498).
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Not signed in");
    const email = (user as { email?: string }).email;

    // --- 1. The user's own goals (full cascade each) ---
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const goal of goals) {
      await purgeGoal(ctx, goal._id);
    }

    // --- 2. Dual-role rows (user on OTHER people's goals) ---

    // Supporters: their memberships on others' goals. Decrement the goal's
    // supporterCount so public counts stay accurate.
    const mySupporterships = await ctx.db
      .query("supporters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of mySupporterships) {
      await ctx.db.delete(s._id);
      const g = await ctx.db.get(s.goalId);
      if (g && (g.supporterCount ?? 0) > 0) {
        await ctx.db.patch(s.goalId, { supporterCount: g.supporterCount - 1 });
      }
    }

    // Support messages they authored on others' goals.
    const myMessages = await ctx.db
      .query("supportMessages")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();
    for (const m of myMessages) await ctx.db.delete(m._id);

    // Motivator pledges they made on others' goals.
    const myPledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of myPledges) await ctx.db.delete(p._id);

    // Applications they submitted to others' goals.
    const myApps = await ctx.db
      .query("motivatorApplications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();
    for (const a of myApps) await ctx.db.delete(a._id);

    // Invites they received (invitedUserId). Safety net for invites they
    // sent as creator is covered by the goal cascade above.
    const receivedInvites = await ctx.db
      .query("motivatorInvites")
      .withIndex("by_invited_user", (q) => q.eq("invitedUserId", userId))
      .collect();
    for (const inv of receivedInvites) await ctx.db.delete(inv._id);

    // Check-ins they sent as a motivator on others' goals.
    const myCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_motivator", (q) => q.eq("motivatorId", userId))
      .collect();
    for (const c of myCheckIns) await ctx.db.delete(c._id);

    // Orphaned media upload intents.
    const myIntents = await ctx.db
      .query("mediaUploadIntents")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const i of myIntents) await ctx.db.delete(i._id);

    // --- 3. Notification prefs + email log ---
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (prefs) await ctx.db.delete(prefs._id);

    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const n of notifs) await ctx.db.delete(n._id);

    // Scrub any remaining notification rows carrying their plaintext email
    // (pre-signup / visitor emails where userId is null).
    if (email) {
      const byEmail = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("toEmail"), email))
        .collect();
      for (const n of byEmail) await ctx.db.delete(n._id);
    }

    // --- 4. Auth tables ---
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const s of sessions) {
      // Cascade: refresh tokens + verifiers reference sessions.
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), s._id))
        .collect();
      for (const rt of refreshTokens) await ctx.db.delete(rt._id);
      const verifiers = await ctx.db
        .query("authVerifiers")
        .filter((q) => q.eq(q.field("sessionId"), s._id))
        .collect();
      for (const v of verifiers) await ctx.db.delete(v._id);
      await ctx.db.delete(s._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const a of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .filter((q) => q.eq(q.field("accountId"), a._id))
        .collect();
      for (const c of codes) await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }

    // --- 5. Storage files ---
    const coverImageId = (user as { coverImageId?: string }).coverImageId;
    if (coverImageId) {
      try {
        await ctx.storage.delete(coverImageId as any);
      } catch {
        // Already deleted or missing — not fatal.
      }
    }

    // --- 6. The user row itself ---
    await ctx.db.delete(userId);

    return { ok: true as const };
  },
});

/**
 * Cascade-delete a single goal and all its child rows + storage files.
 * Mirrors goals.remove (goals.ts:498) but callable without auth (the caller
 * deleteAccount has already verified ownership).
 */
async function purgeGoal(ctx: any, goalId: any) {
  const goal = await ctx.db.get(goalId);
  if (!goal) return;

  // Delete order respects back-references:
  // checkIns → applications → invites → pledges → badges/supporters/messages/
  // reactions/reports → updates(+storage) → mediaUploadIntents → goal.
  for (const table of [
    "checkIns",
    "motivatorApplications",
    "motivatorInvites",
    "motivatorPledges",
    "badges",
    "supporters",
    "supportMessages",
    "reactions",
    "reports",
  ] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_goal", (q: any) => q.eq("goalId", goalId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
  }

  // Updates + their storage files.
  const updates = await ctx.db
    .query("updates")
    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
    .collect();
  for (const u of updates) {
    const storageIds = new Set();
    for (const item of (u as any).media ?? []) {
      if (item.kind === "image") {
        if (item.storageId) storageIds.add(item.storageId);
        if (item.thumbnailId) storageIds.add(item.thumbnailId);
      }
    }
    for (const sid of storageIds) {
      try {
        await ctx.storage.delete(sid);
      } catch {
        // missing file — skip
      }
    }
    await ctx.db.delete(u._id);
  }

  // Media upload intents for this goal.
  const intents = await ctx.db
    .query("mediaUploadIntents")
    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
    .collect();
  for (const i of intents) await ctx.db.delete(i._id);

  // Goal cover image.
  if (goal.coverImageId) {
    try {
      await ctx.storage.delete(goal.coverImageId);
    } catch {
      // missing — skip
    }
  }

  await ctx.db.delete(goalId);
}
