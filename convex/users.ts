// @ts-nocheck — see convex/goals.ts header.
/**
 * User-facing queries. Convex Auth manages the actual user records.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Minimal profile for the currently signed-in user, or null. */
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
    };
  },
});

/** Batch fetch of public organizer profiles by id. */
export const profilesById = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, { ids }) => {
    const out: Record<string, { _id: string; name: string | null; image: string | null }> = {};
    await Promise.all(
      ids.map(async (id) => {
        const u = await ctx.db.get(id);
        if (!u) return;
        out[id] = {
          _id: id,
          name: (u as { name?: string }).name ?? null,
          image: (u as { image?: string }).image ?? null,
        };
      })
    );
    return out;
  },
});
