/**
 * Progress updates — notes, media, links, values, milestones.
 *
 * Value-type updates are written through `goals.recordValue` so badges stay
 * in sync; this file is the catch-all for the other four update kinds and
 * also exposes the read paths used by the public timeline + dashboard.
 */
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const updateType = v.union(
  v.literal("note"),
  v.literal("image"),
  v.literal("media"),
  v.literal("link"),
  v.literal("value"),
  v.literal("milestone")
);

const MAX_MEDIA_IMAGES = 6;
const MAX_EMBEDS = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 1 * 1024 * 1024;
const UPLOAD_INTENT_TTL_MS = 30 * 60 * 1000;

function cleanNote(note: string | undefined) {
  const trimmed = note?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 2_000) throw new Error("Captions can be up to 2,000 characters");
  return trimmed;
}

/**
 * Convert supported public post URLs into a fixed canonical + embed URL.
 * Persisting those values means public pages never use untrusted iframe srcs.
 */
function normalizePublicEmbed(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid public video URL");
  }
  if (url.protocol !== "https:") throw new Error("Media links must use HTTPS");

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? path[0]
        : url.searchParams.get("v") ??
          (path[0] === "shorts" || path[0] === "embed" ? path[1] : undefined);
    if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) {
      throw new Error("That YouTube link does not include a valid video");
    }
    return {
      kind: "embed" as const,
      provider: "youtube" as const,
      providerId: id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  if (host === "tiktok.com" || host === "m.tiktok.com") {
    const videoIndex = path.indexOf("video");
    const id = videoIndex >= 0 ? path[videoIndex + 1] : undefined;
    if (!id || !/^\d{10,24}$/.test(id)) {
      throw new Error("Use the full public TikTok video link, not a shortened link");
    }
    const handle = path.find((segment) => segment.startsWith("@"));
    return {
      kind: "embed" as const,
      provider: "tiktok" as const,
      providerId: id,
      canonicalUrl: handle
        ? `https://www.tiktok.com/${handle}/video/${id}`
        : `https://www.tiktok.com/video/${id}`,
      embedUrl: `https://www.tiktok.com/player/v1/${id}?controls=1&description=0&music_info=0`,
    };
  }

  if (host === "instagram.com" || host === "m.instagram.com") {
    const contentType = path[0]?.toLowerCase();
    const shortcode = path[1];
    if (!contentType || !shortcode || !["p", "reel", "reels", "tv"].includes(contentType) || !/^[A-Za-z0-9_-]+$/.test(shortcode)) {
      throw new Error("Use a public Instagram post or Reel link");
    }
    const canonicalType = contentType === "reels" ? "reel" : contentType;
    return {
      kind: "embed" as const,
      provider: "instagram" as const,
      providerId: shortcode,
      canonicalUrl: `https://www.instagram.com/${canonicalType}/${shortcode}/`,
      // Instagram uses its official embed script rather than a third-party iframe.
      embedUrl: `https://www.instagram.com/${canonicalType}/${shortcode}/embed/`,
    };
  }

  throw new Error("Media embeds currently support YouTube, TikTok, and Instagram");
}

/**
 * Public: timeline of visible updates on a goal (newest first).
 *
 * Bounded — an unbounded `.collect()` here would send a goal's entire history
 * on every page load and eventually trip Convex's read limits. Callers wanting
 * the full archive should use `listForGoalPaginated`.
 */
export const listForGoal = query({
  args: { goalId: v.id("goals"), limit: v.optional(v.number()) },
  handler: async (ctx, { goalId, limit }) => {
    return ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", goalId).eq("publicVisible", true)
      )
      .order("desc")
      .take(Math.min(Math.max(limit ?? 100, 1), 200));
  },
});

/**
 * Public: updates tied to a specific milestone (for expandable milestone rows).
 *
 * Must filter on `publicVisible` like every other public read path. Milestone
 * ticks written by `goals.toggleMilestone` are auto-approved, but `updates.add`
 * accepts an owner-supplied `milestoneId` on note/image/link updates, and those
 * are created `publicVisible: false` — and stay false when moderation rejects
 * them. Without this filter the query hands pending and rejected content to
 * anonymous callers: both arguments are public (`public.getGoalBySlug` returns
 * the goal `_id` plus the whole `milestones` array).
 */
export const listForMilestone = query({
  args: { goalId: v.id("goals"), milestoneId: v.string() },
  handler: async (ctx, { goalId, milestoneId }) => {
    const rows = await ctx.db
      .query("updates")
      .withIndex("by_goal_milestone_created", (q) =>
        q.eq("goalId", goalId).eq("milestoneId", milestoneId)
      )
      .order("desc")
      .collect();
    return rows.filter((u) => u.publicVisible === true);
  },
});

/** Public: a small activity slice without transferring an entire timeline. */
export const listRecentForGoal = query({
  args: { goalId: v.id("goals"), limit: v.optional(v.number()) },
  handler: async (ctx, { goalId, limit }) =>
    ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", goalId).eq("publicVisible", true)
      )
      .order("desc")
      .take(Math.min(Math.max(limit ?? 8, 1), 20)),
});

/** Public: paginated timeline so old media isn't transferred up front. */
export const listForGoalPaginated = query({
  args: { goalId: v.id("goals"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { goalId, paginationOpts }) =>
    ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", goalId).eq("publicVisible", true)
      )
      .order("desc")
      .paginate(paginationOpts),
});

/** Public: count for summary stats without transferring update records. */
export const countForGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const updates = await ctx.db
      .query("updates")
      .withIndex("by_goal_visible_created", (q) =>
        q.eq("goalId", goalId).eq("publicVisible", true)
      )
      .collect();
    return updates.length;
  },
});

/** Owner: every update on a goal, including hidden ones. */
export const listForOwner = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) return [];
    return ctx.db
      .query("updates")
      .withIndex("by_goal_created", (q) => q.eq("goalId", goalId))
      .order("desc")
      .collect();
  },
});

/** Owner: add a new update to one of their goals. */
export const add = mutation({
  args: {
    goalId: v.id("goals"),
    type: updateType,
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    value: v.optional(v.number()),
    milestoneId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");
    if (goal.ownerId !== userId) throw new Error("Not the goal owner");
    if (args.type === "media") {
      throw new Error("Use the dedicated media update flow");
    }

    // Validate milestoneId belongs to this goal if provided.
    if (args.milestoneId && goal.milestones) {
      const exists = goal.milestones.some((m: any) => m.id === args.milestoneId);
      if (!exists) throw new Error("Milestone not found on this goal");
    }

    const updateId = await ctx.db.insert("updates", {
      goalId: args.goalId,
      ownerId: userId,
      type: args.type,
      note: cleanNote(args.note),
      imageId: args.imageId,
      linkUrl: args.linkUrl,
      linkTitle: args.linkTitle,
      value: args.value,
      milestoneId: args.milestoneId,
      moderationStatus: "pending",
      publicVisible: false,
      createdAt: Date.now(),
    });
    // Reset stale-goal reminder so the next staleness window starts fresh.
    await ctx.db.patch(args.goalId, { lastStaleReminderAt: undefined });
    await ctx.scheduler.runAfter(0, internal.moderation.reviewUpdate, { updateId });
    // Fetch OG link preview for link-type updates.
    if (args.type === "link" && args.linkUrl) {
      await ctx.scheduler.runAfter(0, internal.linkPreview.fetchPreview, { updateId });
    }
    await ctx.scheduler.runAfter(0, internal.partnerPush.pushUpdateToAiblInternal, {
      userId,
      goalId: args.goalId,
      gmmKey: `update:${updateId}`,
      title: cleanNote(args.note) || "Progress update",
      completed: false,
    });
    return updateId;
  },
});

/** Owner: request a one-shot upload URL for a new image. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return ctx.storage.generateUploadUrl();
  },
});

/** Owner: request an owner- and goal-bound URL for a progress-media upload. */
export const generateMediaUploadUrl = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");

    const token = crypto.randomUUID();
    await ctx.db.insert("mediaUploadIntents", {
      token,
      ownerId: userId,
      goalId,
      createdAt: Date.now(),
    });
    return { uploadUrl: await ctx.storage.generateUploadUrl(), uploadToken: token };
  },
});

/** Owner: publish photos and/or supported public social video embeds as one update. */
export const addMedia = mutation({
  args: {
    goalId: v.id("goals"),
    note: v.optional(v.string()),
    uploads: v.array(
      v.object({
        storageId: v.id("_storage"),
        uploadToken: v.string(),
        thumbnailId: v.optional(v.id("_storage")),
        thumbnailUploadToken: v.optional(v.string()),
      })
    ),
    embedUrls: v.array(v.string()),
  },
  handler: async (ctx, { goalId, note, uploads, embedUrls }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.ownerId !== userId) throw new Error("Not the goal owner");

    if (uploads.length > MAX_MEDIA_IMAGES) {
      throw new Error(`Add up to ${MAX_MEDIA_IMAGES} images at a time`);
    }
    if (embedUrls.length > MAX_EMBEDS) {
      throw new Error(`Add up to ${MAX_EMBEDS} public video links at a time`);
    }
    if (uploads.length + embedUrls.length === 0) {
      throw new Error("Add a photo or public video link");
    }
    const storageIds = uploads.flatMap((upload) =>
      upload.thumbnailId ? [upload.storageId, upload.thumbnailId] : [upload.storageId]
    );
    const uploadTokens = uploads.flatMap((upload) =>
      upload.thumbnailUploadToken
        ? [upload.uploadToken, upload.thumbnailUploadToken]
        : [upload.uploadToken]
    );
    if (new Set(storageIds).size !== storageIds.length) {
      throw new Error("Each image variant can only be added once");
    }
    if (new Set(uploadTokens).size !== uploadTokens.length) {
      throw new Error("Each image variant needs its own upload link");
    }

    const now = Date.now();
    for (const upload of uploads) {
      if (Boolean(upload.thumbnailId) !== Boolean(upload.thumbnailUploadToken)) {
        throw new Error("Each thumbnail needs its matching upload link");
      }
      for (const [storageId, uploadToken, sizeLimit] of [
        [upload.storageId, upload.uploadToken, MAX_IMAGE_BYTES],
        ...(upload.thumbnailId && upload.thumbnailUploadToken
          ? [[upload.thumbnailId, upload.thumbnailUploadToken, MAX_THUMBNAIL_BYTES] as const]
          : []),
      ] as const) {
        const intent = await ctx.db
          .query("mediaUploadIntents")
          .withIndex("by_token", (q) => q.eq("token", uploadToken))
          .unique();
        if (!intent || intent.ownerId !== userId || intent.goalId !== goalId || now - intent.createdAt > UPLOAD_INTENT_TTL_MS) {
          throw new Error("One of the image upload links has expired. Please choose it again.");
        }
        const metadata = await ctx.db.system.get("_storage", storageId);
        if (!metadata || !metadata.contentType?.startsWith("image/") || metadata.size > sizeLimit) {
          throw new Error("Images must be valid image files within the size limit");
        }
      }
    }

    const normalizedEmbeds = Array.from(new Set(embedUrls.map((url) => url.trim()).filter(Boolean))).map(normalizePublicEmbed);
    const media = [
      ...uploads.map((upload) => ({
        kind: "image" as const,
        storageId: upload.storageId,
        thumbnailId: upload.thumbnailId,
      })),
      ...normalizedEmbeds,
    ];

    for (const uploadToken of uploadTokens) {
      const intent = await ctx.db
        .query("mediaUploadIntents")
        .withIndex("by_token", (q) => q.eq("token", uploadToken))
        .unique();
      if (intent) await ctx.db.delete(intent._id);
    }

    const updateId = await ctx.db.insert("updates", {
      goalId,
      ownerId: userId,
      type: "media",
      note: cleanNote(note),
      media,
      moderationStatus: "pending",
      publicVisible: false,
      createdAt: now,
    });
    // Reset stale-goal reminder so the next staleness window starts fresh.
    await ctx.db.patch(goalId, { lastStaleReminderAt: undefined });
    await ctx.scheduler.runAfter(0, internal.moderation.reviewUpdate, { updateId });
    return updateId;
  },
});

/** Owner: hard-delete an update. */
export const remove = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const u = await ctx.db.get(updateId);
    if (!u) return;
    if (u.ownerId !== userId) throw new Error("Not the owner");
    const storageIds = new Set<Id<"_storage">>();
    for (const item of u.media ?? []) {
      if (item.kind === "image") {
        if (item.storageId) storageIds.add(item.storageId);
        if (item.thumbnailId) storageIds.add(item.thumbnailId);
      }
    }
    for (const storageId of storageIds) {
      await ctx.storage.delete(storageId);
    }
    await ctx.db.delete(updateId);
  },
});

/** Owner: soft-hide an update from the public timeline. */
export const hide = mutation({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const u = await ctx.db.get(updateId);
    if (!u) return;
    if (u.ownerId !== userId) throw new Error("Not the owner");
    await ctx.db.patch(updateId, { publicVisible: false });
  },
});

/**
 * Undo a progress update with an optional reason. Marks the update as
 * reverted (keeps the audit trail) and recalculates the goal's currentValue.
 *
 *   - value (number/streak): finds the previous non-reverted value update
 *     and sets currentValue to that. If none exists, resets to startValue.
 *   - milestone: un-toggles the milestone (done=false) and decrements count.
 *   - note/media/link: just marks reverted (no progress impact).
 */
export const undoUpdate = mutation({
  args: {
    updateId: v.id("updates"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { updateId, reason }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const update = await ctx.db.get(updateId);
    if (!update) throw new Error("Update not found");
    if (update.ownerId !== userId) throw new Error("Not the owner");
    if (update.revertedAt) throw new Error("Already undone");

    const now = Date.now();
    const goal = await ctx.db.get(update.goalId);
    if (!goal) throw new Error("Goal not found");

    // Mark the update as reverted (don't delete — audit trail).
    await ctx.db.patch(updateId, {
      revertedAt: now,
      revertReason: reason?.trim() || undefined,
    });

    if (update.type === "value") {
      // Scan recent updates and find the latest non-reverted value.
      const recentUpdates = await ctx.db
        .query("updates")
        .withIndex("by_goal_created", (q) => q.eq("goalId", update.goalId))
        .order("desc")
        .take(50);

      const latestValue = recentUpdates.find(
        (u) => u.type === "value" && !u.revertedAt && u._id !== updateId
      );

      await ctx.db.patch(update.goalId, {
        currentValue: latestValue?.value ?? goal.startValue ?? 0,
        ...(goal.progressType === "streak"
          ? {
              // Prefer the day the log was credited to. Deriving it from
              // `createdAt` is only a fallback for rows written before
              // `streakDay` existed, and is wrong for any log that the
              // post-midnight grace window credited to the previous day.
              streakLastLoggedDay: latestValue
                ? latestValue.streakDay ??
                  new Date(
                    latestValue.createdAt -
                      (goal.streakTimezoneOffsetMinutes ?? 0) * 60_000
                  )
                    .toISOString()
                    .slice(0, 10)
                : undefined,
            }
          : {}),
        updatedAt: now,
      });
    } else if (update.type === "milestone" && update.milestoneId) {
      if (goal.progressType === "milestones" && goal.milestones) {
        const milestones = goal.milestones.map((m) =>
          m.id === update.milestoneId
            ? { ...m, done: false, completedAt: undefined }
            : m
        );
        const completedCount = milestones.filter((m) => m.done).length;
        await ctx.db.patch(update.goalId, {
          milestones,
          currentValue: completedCount,
          updatedAt: now,
        });
      }
    }

    return { ok: true };
  },
});
