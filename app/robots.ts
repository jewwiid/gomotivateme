import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Served at /robots.txt.
 *
 * Everything under the signed-in app is disallowed: those pages render nothing
 * useful to a crawler (they're client-rendered behind auth) and single-use
 * routes like /invite/<token> should never end up in an index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/settings",
          "/setup",
          "/welcome",
          "/motivate",
          "/invite/",
          "/email/",
          "/o/apply/",
          "/reset",
          "/verify",
          "/api/",
          "/connect/",
        ],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
