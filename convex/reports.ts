/** Public reporting intake and internal report-review queue. */
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

const reportReason = v.union(
  v.literal("sexual"),
  v.literal("violence"),
  v.literal("harassment"),
  v.literal("hate"),
  v.literal("self_harm"),
  v.literal("spam"),
  v.literal("other")
);

/** One report per device per target; repeated reports cannot inflate a count. */
export const submit = mutation({
  args: {
    goalId: v.id("goals"),
    updateId: v.optional(v.id("updates")),
    reporterKey: v.string(),
    reason: reportReason,
    details: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, updateId, reporterKey, reason, details }) => {
    if (!reporterKey || reporterKey.length > 200) throw new Error("Missing report identifier");
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new Error("Goal not found");

    let targetType: "goal" | "update" = "goal";
    let targetKey = `goal:${goalId}`;
    let update: Awaited<ReturnType<typeof ctx.db.get>> | null = null;
    if (updateId) {
      update = await ctx.db.get(updateId);
      if (!update || update.goalId !== goalId || !update.publicVisible) {
        throw new Error("Update not found");
      }
      targetType = "update";
      targetKey = `update:${updateId}`;
    }

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_target_reporter", (q) =>
        q.eq("targetKey", targetKey).eq("reporterKey", reporterKey)
      )
      .first();
    if (existing) return { submitted: false, state: "already_reported" as const };

    const trimmedDetails = details?.trim();
    if (trimmedDetails && trimmedDetails.length > 1_000) {
      throw new Error("Report details can be up to 1,000 characters");
    }

    await ctx.db.insert("reports", {
      targetType,
      targetKey,
      goalId,
      updateId,
      reporterKey,
      reason,
      details: trimmedDetails || undefined,
      status: "open",
      createdAt: Date.now(),
    });

    if (update && updateId) {
      const reportCount = (update.reportCount ?? 0) + 1;
      // Two independent reports temporarily hide the item, avoiding one-click
      // abuse while reducing the chance that harmful content stays visible.
      await ctx.db.patch(updateId, {
        reportCount,
        ...(reportCount >= 2
          ? {
              publicVisible: false,
              moderationStatus: "review" as const,
              moderationReason: "Hidden after multiple community reports",
            }
          : {}),
      });
    }

    return { submitted: true, state: "open" as const };
  },
});

/** Internal operations queue for `npx convex run moderation:listOpenReports`. */
export const listOpenReports = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) =>
    ctx.db
      .query("reports")
      .withIndex("by_status_created", (q) => q.eq("status", "open"))
      .order("desc")
      .take(Math.min(Math.max(limit ?? 50, 1), 100)),
});

/** Resolve a report after a human decision; update visibility is decided separately. */
export const resolve = internalMutation({
  args: {
    reportId: v.id("reports"),
    decision: v.union(v.literal("resolved"), v.literal("dismissed")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, decision, note }) => {
    const report = await ctx.db.get(reportId);
    if (!report) throw new Error("Report not found");
    await ctx.db.patch(reportId, {
      status: decision,
      resolutionNote: note?.trim() || undefined,
      reviewedAt: Date.now(),
    });
  },
});
