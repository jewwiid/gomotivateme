import { Suspense } from "react";
import { ExploreContent } from "./ExploreContent";

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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
    </div>
  );
}
