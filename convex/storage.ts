/**
 * Storage helpers — resolve `_storage` IDs to public URLs.
 *
 * Used by the public goal page, the dashboard cover-photo picker, the
 * discover feed, and the OG image generator to turn stored file IDs into
 * the URLs they can render in <img>, in CSS, or in the imageResponse stream.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";

/** Resolve a list of storage IDs to their public URLs.
 *  Missing or deleted files are simply absent from the returned record —
 *  callers should use optional chaining (`urls?.[id]`) and truthy checks. */
export const getUrls = query({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    const out: Record<string, string> = {};
    // Resolve in parallel — `getUrl` is a single network hop per id.
    await Promise.all(
      ids.map(async (id) => {
        const url = await ctx.storage.getUrl(id);
        if (url) out[id] = url;
      })
    );
    return out;
  },
});
