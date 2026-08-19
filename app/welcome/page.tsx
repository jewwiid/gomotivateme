"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { JOURNEY_ILLUSTRATIONS } from "@/lib/journeyIllustrations";
import { useCurrentUser } from "@/lib/useCurrentUser";

const STEPS = [
  {
    number: "1",
    title: "Name the goal",
    body: "Say what you want to do, how you’ll recognise progress, and the kind of help that would actually be useful.",
    href: "/dashboard/new",
    cta: "Create a goal",
  },
  {
    number: "2",
    title: "Choose who sees it",
    body: "Keep it private, send an unlisted link, or put it in Explore. You can change visibility later.",
    href: "/faq",
    cta: "How visibility works",
  },
  {
    number: "3",
    title: "Invite the right people",
    body: "Share the page with the people you want beside you. They can cheer, check in, or apply to support.",
    href: "/explore",
    cta: "See public goals",
  },
] as const;

export default function WelcomePage() {
  const { user, isAuthenticated, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signup");
    }
  }, [isAuthenticated, isLoading, router]);

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main className="px-5 py-12 sm:px-8 sm:py-20">
        <div className="shell-content grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div>
            <p className="brand-kicker">You’re in</p>
            <h1 className="mt-3 max-w-[12ch] text-balance font-display text-[clamp(2.8rem,5vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
              {firstName ? `${firstName}, the next step is the goal.` : "The next step is the goal."}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--color-text-secondary)]">
              Your account is ready. Give the work a public or private home, then invite the people who should see it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard/new"
                data-fast-goal="start_goal_clicked"
                data-fast-goal-source="welcome"
                className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] active:translate-y-0"
              >
                Start your first goal
                <span className="ml-3" aria-hidden>
                  →
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Go to your dashboard
              </Link>
            </div>
            <p className="mt-8 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
              Questions? Email{" "}
              <a href="mailto:hello@gomotivateme.com" className="font-semibold text-[var(--color-primary)] hover:underline">
                hello@gomotivateme.com
              </a>
              . We reply within one business day.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[32rem]">
            <Image
              src={JOURNEY_ILLUSTRATIONS.begin.src}
              alt={JOURNEY_ILLUSTRATIONS.begin.alt}
              width={1254}
              height={1254}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>

        <ol className="shell-content mt-16 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="bg-[var(--color-surface)] p-7 sm:p-9">
              <p className="font-mono text-xs font-medium tracking-[0.12em] text-[var(--color-primary)]">
                {step.number}
              </p>
              <h2 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">{step.title}</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{step.body}</p>
              <Link
                href={step.href}
                className="mt-6 inline-flex text-sm font-semibold text-[var(--color-primary)] transition hover:underline"
              >
                {step.cta} →
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
