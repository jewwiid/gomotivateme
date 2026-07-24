import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Server component layout for the public goal page.
 *
 * The page itself (`page.tsx`) is a 'use client' component so it can't export
 * generateMetadata. This layout runs on the server, fetches the goal by slug
 * via the Convex HTTP client, and exports metadata for social sharing / SEO.
 * It renders children (the client page) unchanged.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      title: "Goal on gomotivateme",
      description: "Support someone's goal on gomotivateme.",
    };
  }

  let goal: any = null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    goal = await client.query(api.public.getGoalBySlug, { slug });
  } catch {
    // network/auth errors — fall through to default metadata
  }

  if (!goal) {
    return {
      title: "Goal not found · gomotivateme",
      description: "This goal may be unlisted or the link is incorrect.",
    };
  }

  // Build an absolute origin for OG image URLs. On Vercel, headers are set; in
  // other environments fall back to the Convex-safe public URL env var.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const title = goal.title ?? "Goal on gomotivateme";
  const description =
    goal.summary ??
    (goal.story ? truncate(goal.story, 155) : "Support someone's goal on gomotivateme.");

  const openGraph = {
    title,
    description,
    ...(origin
      ? { images: [`${origin}/o/${slug}/opengraph-image`] }
      : {}),
  };

  return {
    title,
    description,
    openGraph,
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      ...(origin
        ? { images: [`${origin}/o/${slug}/opengraph-image`] }
        : {}),
    },
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