// @ts-nocheck — see convex/goals.ts header.
/**
 * Follow graph — approval-gated follower system.
 *
 * Mirrors the Motivation Circle approval pattern:
 *   - "open" followPolicy → instant accept
 *   - "approval" followPolicy → pending request the followee must approve
 *
 * Only accepted followers can see private goals.
 */
import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// =====================================================================
// Mutations
// =====================================================================

/** Request to follow someone. Auto-accepts if their policy is "open". */
export const request = mutation({
  args: { followeeId: v.id("users") },
  handler: async (ctx, { followeeId }) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) throw new Error("Sign in to follow someone");
    if (followerId === followeeId) throw new Error("You can't follow yourself");

    // Check for existing relationship.
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();

    if (existing) {
      if (existing.status === "accepted") throw new Error("Already following");
      if (existing.status === "pending") throw new Error("Follow request already sent");
      // If previously declined/removed, allow re-request.
    }

    const followee = await ctx.db.get(followeeId);
    const policy = (followee as any)?.followPolicy ?? "approval";
    const now = Date.now();

    if (existing) {
      // Reactivate a declined/removed relationship.
      if (policy === "open") {
        await ctx.db.patch(existing._id, {
          status: "accepted",
          acceptedAt: now,
        });
      } else {
        await ctx.db.patch(existing._id, { status: "pending", acceptedAt: undefined });
      }
    } else {
      if (policy === "open") {
        await ctx.db.insert("follows", {
          followeeId,
          followerId,
          status: "accepted",
          createdAt: now,
          acceptedAt: now,
        });
      } else {
        await ctx.db.insert("follows", {
          followeeId,
          followerId,
          status: "pending",
          createdAt: now,
        });
      }
    }

    // Notify the followee.
    const follower = await ctx.db.get(followerId);
    if (followee?.email) {
      await ctx.runMutation(internal.emails.enqueue, {
        userId: followeeId,
        toEmail: followee.email,
        templateId: policy === "open" ? "newFollower" : "followRequest",
        category: "lifecycle",
        preferenceKey: "socialActivity",
        payload: JSON.stringify({
          followerName: follower?.name ?? follower?.handle ?? "Someone",
          followerHandle: follower?.handle ?? undefined,
          followeeName: followee.name ?? followee.handle ?? "there",
        }),
      });
    }

    return { status: policy === "open" ? ("accepted" as const) : ("pending" as const) };
  },
});

/** Followee approves a pending request. */
export const approve = mutation({
  args: { followerId: v.id("users") },
  handler: async (ctx, { followerId }) => {
    const followeeId = await getAuthUserId(ctx);
    if (!followeeId) throw new Error("Not signed in");

    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();
    if (!row) throw new Error("No follow request from this user");
    if (row.status !== "pending") throw new Error("This request is not pending");

    await ctx.db.patch(row._id, { status: "accepted", acceptedAt: Date.now() });
    return { ok: true };
  },
});

/** Followee declines a pending request. */
export const decline = mutation({
  args: { followerId: v.id("users") },
  handler: async (ctx, { followerId }) => {
    const followeeId = await getAuthUserId(ctx);
    if (!followeeId) throw new Error("Not signed in");

    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();
    if (!row) throw new Error("No follow request from this user");

    await ctx.db.patch(row._id, { status: "declined" });
    return { ok: true };
  },
});

/** Followee removes an existing follower. */
export const remove = mutation({
  args: { followerId: v.id("users") },
  handler: async (ctx, { followerId }) => {
    const followeeId = await getAuthUserId(ctx);
    if (!followeeId) throw new Error("Not signed in");

    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();
    if (!row) throw new Error("This person isn't following you");

    await ctx.db.patch(row._id, { status: "removed" });
    return { ok: true };
  },
});

/** Follower cancels their own pending request or unfollows. */
export const cancel = mutation({
  args: { followeeId: v.id("users") },
  handler: async (ctx, { followeeId }) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) throw new Error("Not signed in");

    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();
    if (!row) throw new Error("No follow relationship found");

    if (row.status === "pending") {
      // Cancel a pending request — delete it.
      await ctx.db.delete(row._id);
    } else {
      // Unfollow an accepted relationship.
      await ctx.db.patch(row._id, { status: "removed" });
    }
    return { ok: true };
  },
});

// =====================================================================
// Queries
// =====================================================================

/** Check follow status from the current user's perspective. */
export const amIFollowing = query({
  args: { followeeId: v.id("users") },
  handler: async (ctx, { followeeId }) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) return null;

    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();

    return row?.status ?? null;
  },
});

/** List accepted followers of the current user. */
export const listFollowers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_followee_status", (q) =>
        q.eq("followeeId", userId).eq("status", "accepted")
      )
      .collect();

    // Hydrate follower profiles.
    const profiles = await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.followerId);
        return u
          ? {
              _id: u._id,
              name: u.name,
              handle: u.handle,
              image: u.image,
              acceptedAt: r.acceptedAt,
            }
          : null;
      })
    );
    return profiles.filter(Boolean);
  },
});

/** List people the current user follows (accepted). */
export const listFollowing = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower_status", (q) =>
        q.eq("followerId", userId).eq("status", "accepted")
      )
      .collect();

    const profiles = await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.followeeId);
        return u
          ? {
              _id: u._id,
              name: u.name,
              handle: u.handle,
              image: u.image,
              acceptedAt: r.acceptedAt,
            }
          : null;
      })
    );
    return profiles.filter(Boolean);
  },
});

/** Pending follow requests for the current user (to approve/decline). */
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_followee_status", (q) =>
        q.eq("followeeId", userId).eq("status", "pending")
      )
      .collect();

    const profiles = await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.followerId);
        return u
          ? {
              _id: u._id,
              name: u.name,
              handle: u.handle,
              image: u.image,
              createdAt: r.createdAt,
            }
          : null;
      })
    );
    return profiles.filter(Boolean);
  },
});

/** Count followers + following for a user (for profile stats). */
export const counts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followee_status", (q) =>
        q.eq("followeeId", userId).eq("status", "accepted")
      )
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower_status", (q) =>
        q.eq("followerId", userId).eq("status", "accepted")
      )
      .collect();
    return {
      followers: followers.length,
      following: following.length,
      pendingRequests: 0, // filled below if this is the current user
    };
  },
});

/** Pending request count for the current user (for notification badge). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_followee_status", (q) =>
        q.eq("followeeId", userId).eq("status", "pending")
      )
      .collect();
    return rows.length;
  },
});

// =====================================================================
// Internal — used by private goal access checks
// =====================================================================

/** Internal: is viewerId an accepted follower of ownerId? */
export const isApprovedFollower = internalQuery({
  args: { followerId: v.id("users"), followeeId: v.id("users") },
  handler: async (ctx, { followerId, followeeId }) => {
    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .first();
    return row?.status === "accepted";
  },
});
