import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Goal on gomotivateme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Legacy OG image route for old /o/[slug]/opengraph-image URLs.
 * Looks up the goal by the deprecated slug query and redirects to the
 * new namespaced OG image path /o/[handle]/[slug]/opengraph-image.
 */
export default async function LegacyOpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: slug } = await params;

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return fallbackImage("Goal not found");
  }

  let goal: any = null;
  try {
    const client = new ConvexHttpClient(convexUrl!);
    goal = await client.query(api.public.getGoalBySlug, { slug });
  } catch {
    // network/auth errors — render fallback
  }

  if (!goal) {
    return fallbackImage(`Goal not found · ${slug}`);
  }

  const ownerHandle = (goal.ownerHandle ?? "").toLowerCase();
  redirect(`/o/${ownerHandle}/${goal.slug}/opengraph-image`);
}

function fallbackImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "white",
          fontSize: 36,
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 64,
          textAlign: "center",
        }}
      >
        {message}
      </div>
    ),
    { ...size }
  );
}
