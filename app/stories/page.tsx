import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { getCategory } from "@/lib/categories";
import { JOURNEY_ILLUSTRATIONS, journeyIllustrationForProgress } from "@/lib/journeyIllustrations";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Open journeys",
  description:
    "Real public goals on GoMotivateMe: the work in progress, the stuck weeks, and the people showing up for it.",
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Open journeys · GoMotivateMe",
    description:
      "Real public goals, written by the people doing the work. Not invented testimonials.",
    url: "/stories",
  },
};

type Journey = {
  _id: string;
  slug: string;
  ownerHandle?: string;
  title: string;
  summary?: string;
  category: string;
  status: string;
  progress: number;
  supporterCount?: number;
  ownerName?: string;
  coverImageId?: string;
  coverImageUrl?: string | null;
  createdAt: number;
};

async function loadJourneys(): Promise<Journey[]> {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return [];
  try {
    const client = new ConvexHttpClient(convexUrl);
    const journeys = (await client.query(api.public.listPublicJourneys, {
      limit: 12,
    })) as Journey[];
    const coverIds = journeys
      .map((journey) => journey.coverImageId)
      .filter((id): id is string => Boolean(id)) as Id<"_storage">[];
    if (coverIds.length === 0) return journeys;
    const urls = (await client.query(api.storage.getUrls, { ids: coverIds })) as Record<
      string,
      string
    >;
    return journeys.map((journey) => ({
      ...journey,
      coverImageUrl: journey.coverImageId ? urls[journey.coverImageId] ?? null : null,
    }));
  } catch {
    return [];
  }
}

export default async function StoriesPage() {
  const journeys = await loadJourneys();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open journeys on GoMotivateMe",
    itemListElement: journeys
      .filter((journey) => journey.ownerHandle)
      .map((journey, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/o/${journey.ownerHandle}/${journey.slug}`,
        name: journey.title,
      })),
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <Header />
      <main className="px-5 pb-24 pt-10 sm:px-8 sm:pb-32 sm:pt-16">
        <div className="shell-content">
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Open journeys", href: "/stories" },
            ]}
          />

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1fr_22rem]">
            <div>
              <p className="brand-kicker">Open journeys</p>
              <h1 className="mt-3 max-w-[14ch] text-balance font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
                The work, in public.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
                These are live goal pages, not made-up reviews. Each one is a person measuring progress out loud and asking for a specific kind of help.
              </p>
            </div>
            <div className="relative hidden aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-elev)] lg:block">
              <Image
                src={JOURNEY_ILLUSTRATIONS.move.src}
                alt={JOURNEY_ILLUSTRATIONS.move.alt}
                fill
                sizes="352px"
                className="object-cover mix-blend-multiply"
              />
            </div>
          </div>

          {journeys.length === 0 ? (
            <div className="mt-14 rounded-[1.5rem] bg-[var(--color-bg-elev)] px-6 py-14">
              <p className="max-w-lg text-xl font-medium">Public journeys will appear here as people publish them.</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">
                In the meantime, Explore is the live directory, and you can put the first page on the board yourself.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Link href="/explore" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  Browse Explore →
                </Link>
                <Link href="/signup" className="text-sm font-semibold text-[var(--color-text)] hover:underline">
                  Start a goal
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-14 grid gap-5 md:grid-cols-2">
              {journeys.map((journey) => {
                const href = journey.ownerHandle
                  ? `/o/${journey.ownerHandle}/${journey.slug}`
                  : "/explore";
                const art = journeyIllustrationForProgress(journey.progress);
                const category = getCategory(journey.category).label;
                const done = journey.status === "completed";
                return (
                  <li key={journey._id}>
                    <Link
                      href={href}
                      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border)]"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-bg-elev)]">
                        {journey.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={journey.coverImageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <Image
                            src={art.src}
                            alt=""
                            fill
                            sizes="(min-width: 768px) 50vw, 100vw"
                            className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-center justify-between gap-3 text-xs font-medium text-[var(--color-text-muted)]">
                          <span>{category}</span>
                          <span>{done ? "Completed" : `${Math.round(journey.progress)}% complete`}</span>
                        </div>
                        <h2 className="mt-5 text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] transition group-hover:text-[var(--color-primary)]">
                          {journey.title}
                        </h2>
                        {journey.summary ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                            {journey.summary}
                          </p>
                        ) : null}
                        <p className="mt-auto pt-6 text-sm text-[var(--color-text-muted)]">
                          {journey.ownerName ?? "Anonymous"}
                          {journey.supporterCount
                            ? ` · ${journey.supporterCount} ${journey.supporterCount === 1 ? "supporter" : "supporters"}`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-16 overflow-hidden rounded-[2rem] bg-[var(--color-primary-soft)] px-7 py-12 sm:px-12">
            <h2 className="max-w-[16ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
              Put your own goal where people can find it.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
              Free to start. You choose public, unlisted, or private.
            </p>
            <Link
              href="/signup"
              data-fast-goal="start_goal_clicked"
              data-fast-goal-source="stories"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[var(--color-text)] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)]"
            >
              Start your goal
              <span className="ml-3" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
