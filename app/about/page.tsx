import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConvexHttpClient } from "convex/browser";
import { ArrowRight, Eye, HeartHandshake, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { FOUNDER, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About GoMotivateMe",
  description:
    "GoMotivateMe helps people turn meaningful personal goals into shared journeys with honest progress and human encouragement. Built in Dublin by Jude Okun.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About GoMotivateMe",
    description:
      "A public place for meaningful personal goals and the people helping you keep going.",
    url: "/about",
  },
};

async function loadFounderPhoto(): Promise<string> {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return FOUNDER.photoFallback;
  try {
    const client = new ConvexHttpClient(convexUrl);
    const profile = await client.query(api.users.getByHandle, { handle: FOUNDER.handle });
    return profile?.image || FOUNDER.photoFallback;
  } catch {
    return FOUNDER.photoFallback;
  }
}

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/about#page`,
  url: `${SITE_URL}/about`,
  name: "About GoMotivateMe",
  mainEntity: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    slogan: "Where personal goals get done",
    description:
      "GoMotivateMe helps people turn meaningful personal goals into shared journeys with honest progress and human encouragement.",
    knowsAbout: [
      "personal goals",
      "goal setting",
      "public accountability",
      "social support",
      "progress tracking",
    ],
    founder: {
      "@type": "Person",
      "@id": `${SITE_URL}/@${FOUNDER.handle}#person`,
      name: FOUNDER.name,
      url: FOUNDER.site,
      image: `${SITE_URL}${FOUNDER.photoFallback}`,
      jobTitle: "Founder",
      address: {
        "@type": "PostalAddress",
        addressLocality: FOUNDER.location,
        addressCountry: "IE",
      },
      sameAs: [FOUNDER.site, FOUNDER.linkedin, FOUNDER.instagram, `${SITE_URL}/@${FOUNDER.handle}`],
    },
  },
};

const principles = [
  {
    icon: HeartHandshake,
    title: "People beside the goal",
    body: "Support should feel human. Ask for encouragement, accountability, practical advice, a thoughtful review, or someone to work alongside you.",
  },
  {
    icon: Eye,
    title: "Visibility is a choice",
    body: "Choose public, unlisted, private, or anonymous sharing. The right amount of visibility is the amount that helps you keep going.",
  },
  {
    icon: ShieldCheck,
    title: "Honest progress counts",
    body: "A goal page has room for the stuck weeks as well as the wins. Returning to a goal is part of the work, not a reason to hide it.",
  },
];

export default async function AboutPage() {
  const founderPhoto = await loadFounderPhoto();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <Header />

      <main className="flex-1 overflow-hidden">
        <section className="px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div className="shell-content mb-10">
            <PageBreadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "About", href: "/about" },
              ]}
            />
          </div>
          <div className="shell-content grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="brand-kicker">About GoMotivateMe</p>
              <h1 className="mt-3 max-w-[12ch] text-balance font-display text-[clamp(3rem,5.5vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
                The goals that matter deserve company.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--color-text-secondary)]">
                GoMotivateMe is a public place for personal goals: make a page, share honest progress, and invite the people you want beside you while you do the work.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] active:translate-y-0"
                >
                  Start your goal <ArrowRight className="ml-3" size={16} aria-hidden />
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex min-h-12 items-center border-b border-[var(--color-text)] text-sm font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Explore public goals
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[38rem]">
              <Image
                src="/illustrations/journey/home-community.webp"
                alt="Three people moving up a mountain trail together."
                width={1254}
                height={1254}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-16 sm:px-8 sm:py-24">
          <div className="shell-content grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="brand-kicker">Our mission</p>
              <h2 className="mt-4 max-w-[16ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                Help people turn meaningful personal goals into shared journeys, with simple structure and human encouragement.
              </h2>
            </div>
            <div className="lg:pt-1">
              <p className="brand-kicker">Our vision</p>
              <p className="mt-4 max-w-xl text-pretty text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
                A world where nobody has to pursue the goals that matter alone.
              </p>
              <p className="mt-7 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
                We believe most personal goals are not solved by more pressure. They are helped by a clearer next step, a place to record the real work, and people who know why it matters.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="shell-content">
            <div className="max-w-3xl">
              <p className="brand-kicker">How we work</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                A little structure. The right people. The honest version.
              </h2>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
              {[
                ["01", "Name the goal", "Set the target, say why it matters, and choose a simple way to recognise progress."],
                ["02", "Choose your visibility", "Keep it private, share an unlisted link, post anonymously, or put it in public Explore."],
                ["03", "Let progress be seen", "Share the good weeks and the stuck ones. People can offer the specific support you asked for."],
              ].map(([number, title, body]) => (
                <li key={number} className="bg-[var(--color-surface)] p-7 sm:p-9">
                  <p className="font-mono text-xs font-medium tracking-[0.12em] text-[var(--color-primary)]">{number}</p>
                  <h3 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">{title}</h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="shell-content grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <article key={title} className="bg-[var(--color-surface)] p-7 sm:p-9">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon size={20} strokeWidth={1.7} aria-hidden />
                </span>
                <h2 className="mt-7 text-2xl font-semibold tracking-[-0.035em]">{title}</h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="shell-content overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-10 sm:px-12 sm:py-14 lg:grid lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-center lg:gap-16">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[16rem] overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-elev)]">
              <Image
                src={founderPhoto}
                alt={`${FOUNDER.name}, founder of GoMotivateMe`}
                fill
                sizes="256px"
                className="object-cover object-top"
              />
            </div>
            <div className="mt-10 lg:mt-0">
              <p className="brand-kicker">Who&apos;s behind this</p>
              <h2 className="mt-4 max-w-[16ch] text-balance font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                {FOUNDER.name}
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">
                Founder · {FOUNDER.location}
              </p>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
                Born in Nigeria, raised in Dublin. Jude designs and ships products end to end — most recently ReelClip on the App Store, Madamore, and this. He came to software from commercial filmmaking, and that visual craft still shapes the work.
              </p>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
                GoMotivateMe is a solo product. Questions reach him, not a queue. Email{" "}
                <a href={`mailto:${FOUNDER.email}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                  {FOUNDER.email}
                </a>{" "}
                and the reply comes within one business day.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <Link href={`/@${FOUNDER.handle}`} className="text-[var(--color-primary)] hover:underline">
                  @{FOUNDER.handle} on GoMotivateMe
                </Link>
                <a href={FOUNDER.site} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                  judeokun.com
                </a>
                <a href={`${FOUNDER.site}/about`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                  About &amp; CV
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
