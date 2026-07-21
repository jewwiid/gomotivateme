import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/not-found.png"
          alt=""
          aria-hidden
          width={240}
          height={240}
          className="mb-2 h-48 w-48 select-none object-contain sm:h-60 sm:w-60"
        />
        <h1 className="mt-2 text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-lg text-[var(--color-text-muted)]">
          That page doesn't exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
        >
          Take me home
        </Link>
      </main>
    </div>
  );
}
