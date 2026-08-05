// @ts-nocheck — see convex/goals.ts header.
/**
 * Link preview fetcher — runs in Node runtime to use fetch + HTML parsing.
 * Queries/mutations live in convex/linkPreviewData.ts (isolate runtime).
 */
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_IMAGE_BYTES = 5_000_000; // 5MB cap

/**
 * Extract OG meta tags from HTML using regex.
 * Looks for: og:title, og:description, og:site_name, og:image, twitter:image
 */
function parseOgTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const metaRegex =
    /<meta\s+(?:property|name)=["'](?:og:|twitter:)?([a-z_:]+)["']\s+content=["']([^"']*)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (value && !result[key]) {
      result[key] = value;
    }
  }
  // Fallback: extract <title> tag if no og:title.
  if (!result["title"]) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) result["title"] = titleMatch[1].trim();
  }
  // Use twitter:image if no og:image.
  if (!result["image"] && result["image:src"]) {
    result["image"] = result["image:src"];
  }
  return result;
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Fetch the link preview for an update.
 * Called via scheduler from updates.add when type === "link".
 */
export const fetchPreview = internalAction({
  args: { updateId: v.id("updates") },
  handler: async (ctx, { updateId }) => {
    const info = await ctx.runQuery(internal.linkPreviewData.getLinkUrl, { updateId });
    if (!info || info.alreadyHasImage) return;

    const url = info.linkUrl;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GoMotivateMe/1.0; +https://gomotivateme.com/bot)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return; // Not HTML — skip.
      }

      const html = await response.text();
      const og = parseOgTags(html);
      const finalUrl = response.url || url;

      const title = og["title"] ?? undefined;
      const description = og["description"] ?? undefined;
      const siteName = og["site_name"] ?? getDomain(finalUrl);
      const imageUrl = og["image"] ? resolveUrl(og["image"], finalUrl) : undefined;

      let imageStorageId: string | undefined;

      if (imageUrl) {
        try {
          const imgController = new AbortController();
          const imgTimeout = setTimeout(() => imgController.abort(), FETCH_TIMEOUT_MS);
          const imgResponse = await fetch(imageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; GoMotivateMe/1.0)" },
            signal: imgController.signal,
            redirect: "follow",
          });
          clearTimeout(imgTimeout);

          if (imgResponse.ok) {
            const imgContentType = imgResponse.headers.get("content-type") ?? "";
            if (imgContentType.startsWith("image/")) {
              const blob = await imgResponse.blob();
              if (blob.size > 0 && blob.size <= MAX_IMAGE_BYTES) {
                imageStorageId = await ctx.storage.store(blob);
              }
            }
          }
        } catch {
          // Image download failed — link still works without it.
        }
      }

      await ctx.runMutation(internal.linkPreviewData.applyPreview, {
        updateId,
        linkTitle: title,
        linkDescription: description?.slice(0, 300),
        linkSiteName: siteName,
        linkImage: imageStorageId,
      });
    } catch (err) {
      console.log(
        `[linkPreview] Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
});
