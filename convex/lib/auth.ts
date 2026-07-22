// @ts-nocheck
/**
 * Shared auth helpers.
 */
import type { QueryCtx, MutationCtx } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Require the caller to be a signed-in admin.
 * Throws if not signed in or if the user has no `isAdmin: true` flag.
 *
 * Usage:
 *   const admin = await requireAdmin(ctx);
 *   // admin is the full user document
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (!user.isAdmin) throw new Error("Admin access required");
  return user;
}

/**
 * Check (without throwing) whether the caller is an admin.
 * Returns the user document if admin, null otherwise.
 */
export async function getAdminUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  if (!user || !user.isAdmin) return null;
  return user;
}
