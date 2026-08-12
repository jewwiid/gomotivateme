import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "How GoMotivateMe works: setting a goal, choosing what progress means, building a support team, and what we do with your data. Free, no subscriptions.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently asked questions · GoMotivateMe",
    description:
      "How goals, supporters, privacy, and email work on GoMotivateMe.",
    url: "/faq",
  },
};

/**
 * Single source for both the rendered page and the FAQPage structured data,
 * so the copy Google indexes can never drift from the copy on screen.
 *
 * `answer` is plain text (schema.org wants text, not markup). Where a link
 * helps on the page, `links` renders after the answer without polluting
 * the structured data.
 */
type Faq = {
  q: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

type FaqSection = { heading: string; blurb: string; items: Faq[] };

const SECTIONS: FaqSection[] = [
  {
    heading: "Getting started",
    blurb: "What this is and what it costs.",
    items: [
      {
        q: "What is GoMotivateMe?",
        answer:
          "It's a public home for personal goals. You set a goal, say what progress actually means for it, and invite people to back you — with encouragement, accountability, practical advice, or a review of how you're doing. The idea is simple: goals kept in a private notes app quietly die, and goals people can see tend to get finished.",
      },
      {
        q: "Is it free?",
        answer:
          "Yes. There are no payments and no subscriptions. We don't take a cut of anything, because there's nothing to take a cut of — this isn't a fundraising site.",
        links: [{ label: "Read the Terms", href: "/legal/terms" }],
      },
      {
        q: "Do I need an account to look around?",
        answer:
          "No. Browsing goals and profiles is open to everyone, and you can leave a reaction on a goal without signing up. You'll need an account to create a goal of your own or to formally join someone's support team.",
        links: [{ label: "Explore goals", href: "/explore" }],
      },
      {
        q: "What kinds of goals belong here?",
        answer:
          "Personal ones you're actually working on: health, learning, career, launching something, creative projects, habits, sports, community, travel, family, and faith. Anything where the work happens over weeks or months rather than in one sitting. It doesn't need to be impressive — clear beats impressive.",
      },
    ],
  },
  {
    heading: "How goals work",
    blurb: "Measuring progress, and who gets to see it.",
    items: [
      {
        q: "How do I measure progress?",
        answer:
          "Three ways, and you pick what fits. A number counts toward a target in whatever unit makes sense — kilometres, pages, users, kilograms. A streak counts consecutive days you showed up. Milestones are a checklist of named steps. You can change the measurement later if you picked the wrong one.",
      },
      {
        q: "Can I keep a goal private?",
        answer:
          "Yes. Every goal is public, unlisted, or private. Public goals appear in Explore and can be found by search engines. Unlisted goals are reachable only by direct link, so you can share with a few people without publishing to the world. Private goals are yours alone.",
      },
      {
        q: "Can I post a goal without my name on it?",
        answer:
          "Yes. A goal can be posted anonymously, which strips your name, handle, and photo from the public page and keeps it off your profile. Useful for the goals that matter most and are hardest to say out loud.",
      },
      {
        q: "What happens when I hit my target?",
        answer:
          "The goal is marked complete, everyone who backed you is told, and the page keeps the full record of how you got there — the stuck weeks included. Finished goals stay up unless you delete them.",
      },
    ],
  },
  {
    heading: "Supporters and motivators",
    blurb: "The people who show up for your goal.",
    items: [
      {
        q: "What does a motivator actually do?",
        answer:
          "You choose what you need, and they choose what they're offering. There are five kinds of support: encouragement when motivation dips, accountability on a schedule, practical advice from someone who's done it, a progress review with real feedback, or someone who joins in and sets their own version of the same goal.",
      },
      {
        q: "How often will I have to check in?",
        answer:
          "Whatever cadence you agree to when you join a goal: after each update, weekly, monthly, or only when the person asks. We'll email you a reminder when a check-in you committed to is overdue, and nothing more often than that.",
      },
      {
        q: "How do I get people onto my support team?",
        answer:
          "Share your goal link, or send a private invite to specific people. Anyone browsing a public goal can also apply to support it, and you approve or decline each application — nobody joins your team without your say-so.",
      },
      {
        q: "What if a goal touches on something sensitive?",
        answer:
          "Some goals deal with health, body, money, or faith, and those pages carry a warning so supporters arrive with the right tone. Public goals are moderated before they're listed in Explore, and our community guidelines set out what's welcome and what isn't.",
        links: [
          { label: "Community guidelines", href: "/legal/community-guidelines" },
        ],
      },
    ],
  },
  {
    heading: "Privacy, email, and your data",
    blurb: "What we send, what we track, and how to stop both.",
    items: [
      {
        q: "What emails will I get?",
        answer:
          "The ones tied to your account and your goals: someone applied to support you, a supporter sent you a message, your deadline is close, your streak is about to break. There's an optional weekly digest and an optional discovery email about new goals, and both are off unless you turn them on.",
      },
      {
        q: "How do I stop the emails?",
        answer:
          "Every email has a one-click unsubscribe, and your notification settings let you switch off whole categories rather than all-or-nothing. Account-critical mail like password resets and email verification always sends, because turning that off would lock you out.",
        links: [{ label: "Notification settings", href: "/settings" }],
      },
      {
        q: "Do you track me around the web?",
        answer:
          "No. We use one privacy-focused analytics tool to count visits and see which pages work, and its script doesn't load at all until you accept analytics. There are no advertising cookies and no cross-site ad tracking. Declining changes nothing about how the site works for you.",
        links: [{ label: "Cookie policy", href: "/legal/cookies" }],
      },
      {
        q: "Can I delete my account?",
        answer:
          "Yes, from your settings, and it takes your goals, updates, and personal data with it. You don't have to email anyone or wait for approval.",
        links: [{ label: "Privacy policy", href: "/legal/privacy" }],
      },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((section) => section.items);

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/faq#faq`,
  mainEntity: ALL_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "FAQ", item: `${SITE_URL}/faq` },
  ],
};

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">
          {/* Visible breadcrumb, matching the BreadcrumbList above. */}
          <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--color-text-muted)]">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-[var(--color-primary)]">
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-[var(--color-border)]">
                /
              </li>
              <li aria-current="page" className="text-[var(--color-text-secondary)]">
                FAQ
              </li>
            </ol>
          </nav>

          <p className="brand-kicker mt-8">Questions</p>
          <h1 className="mt-2 title-page">Frequently asked questions</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
            How goals, supporters, privacy, and email work here. If something
            isn&rsquo;t covered,{" "}
            <a
              href="mailto:hello@gomotivateme.com"
              className="font-semibold text-[var(--color-primary)] transition hover:underline"
            >
              email us
            </a>{" "}
            and we&rsquo;ll answer — and add it to this page.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-xl font-bold text-[var(--color-text)]">
                {section.heading}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-dim)]">{section.blurb}</p>

              <div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {section.items.map((item) => (
                  /*
                   * Native <details> — the answer stays in the DOM for crawlers
                   * and works with zero JavaScript, unlike a state-driven
                   * accordion that would force this page to be a client
                   * component and hide the copy from the initial HTML.
                   */
                  <details key={item.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left font-semibold text-[var(--color-text)] transition hover:text-[var(--color-primary)] [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-lg leading-none text-[var(--color-text-muted)] transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div className="mt-3 leading-7 text-[var(--color-text-muted)]">
                      <p>{item.answer}</p>
                      {item.links?.length ? (
                        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                          {item.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="text-[var(--color-primary)] transition hover:underline"
                            >
                              {link.label} →
                            </Link>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-8">
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Ready to put a goal where people can see it?
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              Free, takes a few minutes, and you choose who sees it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                Start a goal
              </Link>
              <Link
                href="/explore"
                className="text-sm font-bold text-[var(--color-primary)] transition hover:underline"
              >
                Browse goals first
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
