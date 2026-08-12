import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/site";
import { FEATURED_CATEGORIES } from "@/lib/categories";

/** Rebuild the sitemap at most once an hour. */
export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explore", changeFrequency: "daily", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/login", changeFrequency: "monthly", priority: 0.4 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/community-guidelines", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Single param on purpose: Next emits <loc> unescaped, so a second param's
  // "&" would make the XML invalid. `tab` defaults to "goals" anyway.
  for (const category of FEATURED_CATEGORIES) {
    entries.push({
      url: `${SITE_URL}/explore?category=${encodeURIComponent(category.id)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Public goals + the profiles behind them. Anonymous goals have no
  // ownerHandle, so they contribute a goal URL only if the handle survived.
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const goals = await client.query(api.public.listRecentPublic, { limit: 500 });
      const handles = new Set<string>();

      for (const goal of goals ?? []) {
        if (!goal.ownerHandle || !goal.slug) continue;
        handles.add(goal.ownerHandle);
        entries.push({
          url: `${SITE_URL}/o/${goal.ownerHandle}/${goal.slug}`,
          lastModified: goal.createdAt ? new Date(goal.createdAt) : now,
          changeFrequency: "daily",
          priority: 0.8,
        });
      }

      for (const handle of handles) {
        entries.push({
          url: `${SITE_URL}/@${handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    } catch {
      // Convex unreachable at build/revalidate time — ship the static routes
      // rather than failing the whole sitemap.
    }
  }

  return entries;
}
