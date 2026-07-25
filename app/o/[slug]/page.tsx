import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";

/**
 * Legacy redirect page for old /o/[slug] URLs.
 *
 * The canonical goal URL is now /o/[handle]/[slug] (namespaced by owner
 * handle). This page handles the old single-segment URLs by looking up the
 * goal via the deprecated `getGoalBySlug` query and redirecting to the new
 * namespaced URL. Two-segment URLs (/o/[handle]/[slug]) are matched by the
 * more specific route at app/o/[handle]/[slug]/ and never reach here.
 */
export default async function LegacyGoalRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    notFound();
  }

  let goal: any = null;
  try {
    const client = new ConvexHttpClient(convexUrl!);
    goal = await client.query(api.public.getGoalBySlug, { slug });
  } catch {
    // network/auth errors — treat as not found
  }

  if (!goal) {
    notFound();
  }

  const ownerHandle = (goal.ownerHandle ?? "").toLowerCase();
  redirect(`/o/${ownerHandle}/${goal.slug}`);
}