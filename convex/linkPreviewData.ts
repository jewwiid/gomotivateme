// @ts-nocheck — see convex/goals.ts header.
/**
 * Link preview data layer — queries + mutations (isolate runtime, NOT "use node").
 * The Node-dependent fetch action lives in convex/linkPreview.ts.
 */
import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** Internal query: get the linkUrl for an update. */
export const getLinkUrl = internalQuery({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const u = await ctx.db.get(updateId);
    if (!u || u.type !== "link" || !u.linkUrl) return null;
    return {
      linkUrl: u.linkUrl,
      linkTitle: u.linkTitle ?? null,
      alreadyHasImage: !!u.linkImage,
    };
  },
});

/** Internal mutation: patch the update with preview data. */
export const applyPreview = internalMutation({
  args: {
    updateId: v.id("updates"),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkSiteName: v.optional(v.string()),
    linkImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.linkDescription) patch.linkDescription = args.linkDescription;
    if (args.linkSiteName) patch.linkSiteName = args.linkSiteName;
    if (args.linkImage) patch.linkImage = args.linkImage;
    // Only fill title if the user didn't provide one.
    const existing = await ctx.db.get(args.updateId);
    if (args.linkTitle && !existing?.linkTitle) {
      patch.linkTitle = args.linkTitle;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.updateId, patch);
    }
  },
});

/** Internal: list link update IDs that don't have a preview yet (for backfill). */
export const _listLinksWithoutPreview = internalQuery({
  args: {},
  handler: async (ctx) => {
    // No index that starts with "type" — use the moderation index (broad scan)
    // and filter in-memory. Capped at 100 for safety.
    const all = await ctx.db
      .query("updates")
      .order("desc")
      .take(200);
    return all
      .filter((u: any) => u.type === "link" && !u.linkImage && !u.linkDescription)
      .map((u: any) => u._id);
  },
});
