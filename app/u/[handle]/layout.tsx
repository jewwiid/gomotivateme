import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gomotivateme.com";

/**
 * Server component layout for the public profile page.
 *
 * The page itself (`page.tsx`) is a 'use client' component so it can't export
 * generateMetadata. This layout runs on the server, fetches the user's profile
 * summary via the Convex HTTP client, and exports metadata for social sharing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const normalizedHandle = handle.toLowerCase();

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      title: "Profile on GoMotivateMe",
      description: "Support someone's goals on GoMotivateMe.",
    };
  }

  let summary: any = null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    summary = await client.query(api.users.profileSummary, {
      handle: normalizedHandle,
    });
  } catch {
    // network/auth errors — fall through to default metadata
  }

  if (!summary) {
    return {
      title: "Profile not found · GoMotivateMe",
      description: "This person may not be on GoMotivateMe yet.",
    };
  }

  const name = summary.user.name ?? summary.user.handle ?? "Someone";
  const bio = summary.user.bio ?? "";
  const goalsCount = summary.stats.goalsCount ?? 0;
  const supportersCount = summary.stats.supportersCount ?? 0;
  const motivatingCount = summary.stats.motivatingCount ?? 0;

  const title = `${name} (@${summary.user.handle}) on GoMotivateMe`;
  const description = bio
    ? truncate(bio, 155)
    : `${name} has ${goalsCount} ${goalsCount === 1 ? "goal" : "goals"} on GoMotivateMe with ${supportersCount} supporters. Join the team and help them get there.`;

  const ogImagePath = `/u/${normalizedHandle}/opengraph-image`;
  const ogImageUrl = new URL(ogImagePath, SITE_URL).toString();

  const openGraph = {
    title,
    description,
    type: "profile" as const,
    siteName: "GoMotivateMe",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${name} on GoMotivateMe`,
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

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}