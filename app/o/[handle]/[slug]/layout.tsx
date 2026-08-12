import type { Metadata } from "next";
import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Cached per request so generateMetadata and the layout body share a single
 * Convex round-trip.
 */
const fetchGoal = cache(async (handle: string, slug: string) => {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.public.getGoalByHandleAndSlug, { handle, slug });
  } catch {
    // network/auth errors — callers fall back to defaults
    return null;
  }
});

/**
 * Server component layout for the public goal page.
 *
 * The page itself (`page.tsx`) is a 'use client' component so it can't export
 * generateMetadata. This layout runs on the server, fetches the goal by
 * handle + slug via the Convex HTTP client, and exports metadata for social
 * sharing / SEO. It renders children (the client page) unchanged.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}): Promise<Metadata> {
  const { handle, slug } = await params;
  const normalizedHandle = handle.toLowerCase();

  const goal: any = await fetchGoal(normalizedHandle, slug);

  if (!goal) {
    return {
      title: "Goal not found",
      description: "This goal may be unlisted or the link is incorrect.",
      robots: { index: false, follow: false },
    };
  }

  const title = goal.title ?? "Goal";
  const description =
    goal.summary ??
    (goal.story ? truncate(goal.story, 155) : "Support someone's goal on GoMotivateMe.");

  const ogImagePath = `/o/${normalizedHandle}/${slug}/opengraph-image`;
  const ogImageUrl = new URL(ogImagePath, SITE_URL).toString();

  const canonical = `/o/${normalizedHandle}/${slug}`;

  const openGraph = {
    title,
    description,
    type: "article" as const,
    siteName: SITE_NAME,
    url: new URL(canonical, SITE_URL).toString(),
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${title} — on GoMotivateMe`,
      },
    ],
  };

  const twitter = {
    card: "summary_large_image" as const,
    title,
    description,
    images: [ogImageUrl],
  };

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical },
    openGraph,
    twitter,
  };
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export default async function GoalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle, slug } = await params;
  const normalizedHandle = handle.toLowerCase();
  const goal: any = await fetchGoal(normalizedHandle, slug);

  if (!goal) return children;

  /**
   * BreadcrumbList so search results show "gomotivateme.com › Explore › @handle"
   * instead of a raw URL.
   */
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Explore", item: `${SITE_URL}/explore` },
      {
        "@type": "ListItem",
        position: 3,
        name: goal.ownerName ?? `@${normalizedHandle}`,
        item: `${SITE_URL}/@${normalizedHandle}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: goal.title ?? "Goal",
        item: `${SITE_URL}/o/${normalizedHandle}/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {children}
    </>
  );
}