import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines: GoMotivateMe",
  description:
    "How we keep gomotivateme.com a place for real encouragement: what to do, what not to do, and what happens when lines get crossed.",
};

const LAST_UPDATED = "July 22, 2026";

export default function CommunityGuidelinesPage() {
  return (
    <article className="space-y-10">
      <header className="border-b border-[#e9e7df] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888983]">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          Community Guidelines
        </h1>
        <p className="mt-3 text-sm text-[#74756f]">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <p className="rounded-2xl border border-[#e9e7df] bg-[#f6f4ec] p-5 text-sm leading-6 text-[#3b3b37]">
        <strong>The short version.</strong> GoMotivateMe is a place for real
        encouragement, not performance. Show up. Be honest. Be kind. Don't
        pretend to be someone you're not. Report what feels wrong. We'll
        handle it.
      </p>

      <div className="space-y-10 text-[15px] leading-7 text-[#3b3b37]">
        <Section title="1. What this place is">
          <p>
            gomotivateme.com is a place to set real goals, build a small
            circle of people who care, and let them keep you moving. It
            works when it's honest, when the encouragement is real, and
            when the goal matters to you.
          </p>
          <p>
            These guidelines exist to keep that working. They're short on
            purpose. If something feels off and it's not listed here, trust
            the spirit of the place.
          </p>
        </Section>

        <Section title="2. The basics">
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>
              <strong>Show up for people.</strong> A 3-word check-in beats a
              perfect post you never send. Be the friend who actually
              replies.
            </li>
            <li>
              <strong>Be specific.</strong> "You can do it!" is fine.
              "Have you tried blocking 90 minutes on Sunday morning?" is
              better. Specific encouragement is more useful than generic
              praise.
            </li>
            <li>
              <strong>Honor the goal.</strong> If someone is trying to lose
              weight, the goal is the goal: don't push a different
              agenda. If they're recovering, same thing. The goal owner
              decides.
            </li>
            <li>
              <strong>Keep it real.</strong> Don't post a goal you don't
              actually care about. Don't send encouragement you don't
              actually mean. The platform is small enough that pretending
              shows.
            </li>
            <li>
              <strong>No selling.</strong> Don't promote your product,
              service, course, or MLM. Don't drop affiliate links. The
              platform isn't a funnel.
            </li>
          </ul>
        </Section>

        <Section title="3. What gets removed">
          <p>
            We remove content and may restrict accounts that post:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>Harassment, threats, or hate speech.</li>
            <li>Sexual content involving real people without consent.</li>
            <li>
              Content that encourages self-harm, suicide, eating disorder
              behavior, or illegal activity.
            </li>
            <li>
              Spam, bot activity, or coordinated inauthentic behavior
              (fake supporters, fake check-ins, etc.).
            </li>
            <li>
              Misinformation presented as fact (e.g. medical claims,
              financial advice) that could cause real harm.
            </li>
            <li>
              Doxxing, threats to expose private information, or
              non-consensual intimate images.
            </li>
            <li>
              Impersonation of another person, brand, or organization in a
              way that's intended to deceive.
            </li>
            <li>
              Content that is hateful or demeaning toward a group based on
              race, ethnicity, national origin, religion, gender, gender
              identity, sexual orientation, age, disability, or any other
              protected category.
            </li>
          </ul>
          <p>
            If you see something that should be removed but isn't, report
            it. We read every report.
          </p>
        </Section>

        <Section title="4. Sensitive categories">
          <p>
            Some topics need extra care. When you create a goal in any of
            these categories, we'll show you a brief prompt asking you to
            read the in-app guidance before you post:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>
              <strong>Weight and body image</strong>: encouragement should
              support the person's actual goal, not push an eating disorder
              or body-shaming culture in either direction.
            </li>
            <li>
              <strong>Mental health</strong>: GoMotivateMe is peer
              encouragement, not therapy. If someone's struggling with
              clinical depression, suicidal thoughts, or other mental health
              crises, encourage them to seek professional help. The
              platform is not equipped for that.
            </li>
            <li>
              <strong>Recovery</strong>: sobriety, grief, illness
              recovery, leaving a high-control group. These are real. Be
              careful with platitudes, be honest about your own limits,
              and don't try to "fix" anyone.
            </li>
          </ul>
          <p>
            If a goal is in one of these categories and you don't feel
            equipped to be helpful, it's better to say so than to fake it.
            Not every goal needs your encouragement.
          </p>
        </Section>

        <Section title="5. Reporting something">
          <p>
            Every goal, update, message, and profile has a "Report" link.
            When you tap it, tell us what's wrong. We read every report.
          </p>
          <p>
            Reports are confidential. The person you reported won't see
            your name.
          </p>
        </Section>

        <Section title="6. How we respond to violations">
          <p>
            Our approach is graduated: first time mistakes get a warning,
            patterns get removed:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>
              <strong>First violation</strong>: content removed, you get a
              written warning with what was wrong and why.
            </li>
            <li>
              <strong>Repeated violations</strong>: temporary account
              restriction (24h, then 7d, then 30d).
            </li>
            <li>
              <strong>Serious violations</strong>: immediate permanent
              removal. This is reserved for: doxxing, threats of violence,
              non-consensual intimate imagery, sexual content involving
              minors, or coordinated harassment.
            </li>
          </ul>
          <p>
            We document every action we take, including the reason, the
            time, and the report (if any) that triggered it. We share
            that documentation with the affected user if you ask.
          </p>
        </Section>

        <Section title="7. Appeals">
          <p>
            If you think we got it wrong, email{" "}
            <a
              href="mailto:appeals@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              appeals@gomotivateme.com
            </a>
            . A different person on the team will review your case
            independently of the original decision. We respond within 7
            days.
          </p>
        </Section>

        <Section title="8. Building the place you want">
          <p>
            These guidelines are a starting point, not the final word.
            The platform will grow, the people on it will surprise us, and
            the rules will need to grow with it.
          </p>
          <p>
            If you have a suggestion for a guideline we should add (or one
            we should remove), email{" "}
            <a
              href="mailto:hello@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              hello@gomotivateme.com
            </a>
            . We read every message.
          </p>
        </Section>
      </div>

      <p className="text-sm text-[#74756f]">
        These Community Guidelines are paired with our{" "}
        <Link
          href="/legal/terms"
          className="text-[var(--color-primary)] underline"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="text-[var(--color-primary)] underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f1f1c]">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
