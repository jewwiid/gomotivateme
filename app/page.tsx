import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { HomeContent } from "./HomeContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — ${SITE_TAGLINE}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

async function loadRecent() {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return [];
  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.public.listRecentPublic, { limit: 12 });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialRecent = await loadRecent();
  return <HomeContent initialRecent={initialRecent} />;
}
