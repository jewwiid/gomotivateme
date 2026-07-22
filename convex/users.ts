// @ts-nocheck — see convex/goals.ts header.
/**
 * User-facing queries + handle management.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      bio: (user as { bio?: string }).bio ?? null,
      coverImageId: (user as { coverImageId?: string }).coverImageId ?? null,
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

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$/;

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
    await ctx.db.patch(userId, patch);
    return { ok: true, changed: Object.keys(patch).length };
  },
});

/** Set or update the user's public handle. */
export const setHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const normalized = handle.toLowerCase().trim();
    if (!HANDLE_RE.test(normalized)) {
      throw new Error("Handle must be 3-30 chars, lowercase letters, digits, _ or -");
    }
    // Check for a clash against any OTHER user with the same handle.
    const clash = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
    if (clash && clash._id !== userId) {
      throw new Error("That handle is taken");
    }
    await ctx.db.patch(userId, { handle: normalized });
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
    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_goal_status", (q) => q.eq("status", "active"))
      .collect();
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
