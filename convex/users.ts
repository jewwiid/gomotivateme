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

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$/;

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
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_handle", (q) => q.eq("ownerHandle", normalized))
      .first();
    if (existing && existing.ownerId !== userId) {
      throw new Error("That handle is taken");
    }
    await ctx.db.patch(userId, { handle: normalized });
    return { handle: normalized };
  },
});
