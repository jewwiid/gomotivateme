import Link from "next/link";
import { Header } from "@/components/Header";
import { JOURNEY_ILLUSTRATIONS } from "@/lib/journeyIllustrations";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={JOURNEY_ILLUSTRATIONS.return.src}
          alt={JOURNEY_ILLUSTRATIONS.return.alt}
          width={240}
          height={240}
          className="mb-0 h-56 w-56 select-none object-contain sm:h-72 sm:w-72"
        />
        <span className="brand-kicker">404</span>
        <h1 className="mt-3 title-hero">This path isn’t here.</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[var(--color-text-muted)]">
          The page you’re looking for may have moved, or the link may be incomplete.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Take me home
        </Link>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-[var(--color-primary)]">
          <Link href="/explore" className="transition hover:underline">
            Explore goals
          </Link>
          <Link href="/stories" className="transition hover:underline">
            Open journeys
          </Link>
          <Link href="/faq" className="transition hover:underline">
            FAQ
          </Link>
          <Link href="/about" className="transition hover:underline">
            About
          </Link>
        </div>
      </main>
    </div>
  );
}
