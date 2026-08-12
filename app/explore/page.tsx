import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreContent } from "./ExploreContent";

export const metadata: Metadata = {
  title: "Explore goals and motivators",
  description:
    "Browse real goals people are working on right now: health, learning, launches, creative projects, habits. Find someone worth cheering on.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore goals and motivators · GoMotivateMe",
    description:
      "Browse real goals people are working on right now and find someone worth cheering on.",
    url: "/explore",
  },
};

/**
 * Discover surface — Goals / Motivators / Categories.
 * Server shell wraps the client view in <Suspense> so the
 * useSearchParams() call inside doesn't opt the whole route into
 * dynamic rendering.
 */
export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-zinc-900" />
    </div>
  );
}
