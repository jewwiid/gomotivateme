import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gomotivateme.com";

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

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      title: "Goal on GoMotivateMe",
      description: "Support someone's goal on GoMotivateMe.",
    };
  }

  let goal: any = null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    goal = await client.query(api.public.getGoalByHandleAndSlug, {
      handle: normalizedHandle,
      slug,
    });
  } catch {
    // network/auth errors — fall through to default metadata
  }

  if (!goal) {
    return {
      title: "Goal not found · GoMotivateMe",
      description: "This goal may be unlisted or the link is incorrect.",
    };
  }

  const title = goal.title ?? "Goal on GoMotivateMe";
  const description =
    goal.summary ??
    (goal.story ? truncate(goal.story, 155) : "Support someone's goal on GoMotivateMe.");

  const ogImagePath = `/o/${normalizedHandle}/${slug}/opengraph-image`;
  const ogImageUrl = new URL(ogImagePath, SITE_URL).toString();

  const openGraph = {
    title,
    description,
    type: "article" as const,
    siteName: "GoMotivateMe",
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
    openGraph,
    twitter,
  };
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export default function GoalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}