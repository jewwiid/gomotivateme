/**
 * Shared visibility rules for goal pages, reactions, and support.
 *
 * public    — anyone, if moderation has approved it
 * unlisted  — anyone with the link (not Explore, sitemap, or profile)
 * private   — owner, accepted followers, supporters, and active motivators
 */
import { getAuthUserId } from "@convex-dev/auth/server";

export function isModerationApproved(goal: { moderationStatus?: string }) {
  return !goal.moderationStatus || goal.moderationStatus === "approved";
}

export async function viewerCanAccessGoal(
  ctx: { db: any },
  goal: any,
  userId: string | null
): Promise<boolean> {
  if (!goal) return false;

  if (goal.status === "draft") {
    return userId !== null && userId === goal.ownerId;
  }
  if (goal.moderationStatus === "rejected") {
    return userId !== null && userId === goal.ownerId;
  }

  if (goal.visibility === "public") {
    return isModerationApproved(goal);
  }

  if (goal.visibility === "unlisted") {
    return true;
  }

  if (goal.visibility === "private") {
    if (!userId) return false;
    if (userId === goal.ownerId) return true;

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q: any) =>
        q.eq("followerId", userId).eq("followeeId", goal.ownerId)
      )
      .first();
    if (follow?.status === "accepted") return true;

    const support = await ctx.db
      .query("supporters")
      .withIndex("by_goal_user", (q: any) =>
        q.eq("goalId", goal._id).eq("userId", userId)
      )
      .first();
    if (support) return true;

    const pledges = await ctx.db
      .query("motivatorPledges")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();
    return pledges.some((p: { goalId: string }) => p.goalId === goal._id);
  }

  return false;
}

export async function requireGoalAccess(ctx: { db: any; auth: any }, goal: any) {
  const userId = await getAuthUserId(ctx);
  const ok = await viewerCanAccessGoal(ctx, goal, userId);
  if (!ok) throw new Error("This goal isn't available");
  return userId;
}

/**
 * Public payload: strip owner identity for anonymous goals unless the
 * viewer owns the goal. Always include viewerIsOwner so the page can
 * render owner tools when ownerId has been stripped.
 */
export function presentGoalForViewer(goal: any, userId: string | null) {
  const viewerIsOwner = userId !== null && userId === goal.ownerId;
  const base = {
    ...goal,
    viewerIsOwner,
  };
  if (goal.isAnonymous && !viewerIsOwner) {
    return {
      ...base,
      ownerName: "Anonymous",
      ownerImage: undefined,
      ownerId: undefined,
    };
  }
  return base;
}
