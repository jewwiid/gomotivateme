// @ts-nocheck — see convex/goals.ts header.
/**
 * In-app notification queries + mutations.
 *
 * The `notifications` table is shared with the email pipeline — every
 * enqueued email is also a potential in-app notification. These functions
 * surface those rows as a display-ready feed with unread tracking.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Map a templateId + parsed payload to display-ready fields.
 * Returns { title, body, href } for the bell feed.
 */
function parseNotification(
  templateId: string,
  payload: Record<string, any>
): { title: string; body: string; href: string } {
  switch (templateId) {
    case "welcome":
      return {
        title: "Welcome to gomotivateme",
        body: "Set up your first goal and start building momentum.",
        href: "/dashboard/new",
      };
    case "newApplication":
      return {
        title: "New motivator application",
        body: `${payload.motivatorName} wants to support ${payload.goalTitle}`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}/applicants` : "/dashboard",
      };
    case "inviteReceived":
      return {
        title: "You're invited to motivate",
        body: `${payload.ownerName} wants you on their team for ${payload.goalTitle}`,
        href: payload.inviteToken ? `/invite/${payload.inviteToken}` : "/motivate",
      };
    case "applicationDecision":
      return {
        title: payload.wasApproved ? "Application approved!" : "Application declined",
        body: `${payload.goalTitle} — ${payload.wasApproved ? "You're in!" : "Not this time."}`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}` : "/motivate",
      };
    case "targetHit":
      return {
        title: "Goal complete! 🎉",
        body: `${payload.goalTitle} hit its target`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}` : "/dashboard",
      };
    case "newUpdate":
      return {
        title: "New update",
        body: `${payload.ownerName} posted on ${payload.goalTitle}`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}` : "/motivate",
      };
    case "supportMessageReceived":
      return {
        title: "New message",
        body: `${payload.authorName} left a note on ${payload.goalTitle}`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}` : "/dashboard",
      };
    case "newReaction":
      return {
        title: "Someone cheered",
        body: `Your goal ${payload.goalTitle} got a reaction`,
        href: payload.goalSlug ? `/o/${payload.goalSlug}` : "/dashboard",
      };
    case "followRequest":
      return {
        title: "Follow request",
        body: `${payload.followerName} wants to follow you`,
        href: payload.followerHandle ? `/@${payload.followerHandle}` : "/settings",
      };
    case "newFollower":
      return {
        title: "New follower",
        body: `${payload.followerName} is now following you`,
        href: payload.followerHandle ? `/@${payload.followerHandle}` : "/settings",
      };
    case "weeklyDigest":
      return {
        title: "Your weekly summary",
        body: "See how your goals went this week",
        href: "/dashboard",
      };
    case "staleGoal":
      return {
        title: "Your goal needs a nudge",
        body: `${payload.goalTitle} hasn't been updated in a while`,
        href: payload.goalId ? `/dashboard/${payload.goalId}` : "/dashboard",
      };
    case "checkInDue":
      return {
        title: "Check-in due",
        body: `${payload.ownerName} could use a check-in on ${payload.goalTitle}`,
        href: "/motivate",
      };
    case "goalCreated":
      return {
        title: "Goal created!",
        body: `${payload.goalTitle} is live. Share it to start building momentum.`,
        href: "/dashboard",
      };
    default:
      return {
        title: "Notification",
        body: "You have an update",
        href: "/dashboard",
      };
  }
}

/** List the current user's 25 most recent notifications, parsed for display. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(25);

    return rows.map((n) => {
      let payload: Record<string, any> = {};
      try {
        payload = JSON.parse(n.payload);
      } catch {
        // malformed payload — fall back to empty
      }
      const display = parseNotification(n.templateId, payload);
      return {
        _id: n._id,
        templateId: n.templateId,
        title: display.title,
        body: display.body,
        href: display.href,
        createdAt: n.createdAt,
        readAt: n.readAt ?? null,
      };
    });
  },
});

/** Count of unread notifications for the current user (for the badge). */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(99);

    return rows.filter((n) => !n.readAt).length;
  },
});

/** Mark a single notification as read. */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const n = await ctx.db.get(notificationId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    if (!n.readAt) {
      await ctx.db.patch(notificationId, { readAt: Date.now() });
    }
    return { ok: true };
  },
});

/** Mark all unread notifications as read. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(99);

    const now = Date.now();
    let marked = 0;
    for (const n of rows) {
      if (!n.readAt) {
        await ctx.db.patch(n._id, { readAt: now });
        marked++;
      }
    }
    return { marked };
  },
});
