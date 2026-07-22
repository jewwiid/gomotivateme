import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — GoMotivateMe",
  description:
    "The rules for using gomotivateme.com — your account, your content, what's allowed, and what's not.",
};

const LAST_UPDATED = "July 22, 2026";
const EFFECTIVE = "July 22, 2026";

export default function TermsPage() {
  return (
    <article className="space-y-10">
      <header className="border-b border-[#e9e7df] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888983]">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-[#74756f]">
          Effective {EFFECTIVE} · Last updated {LAST_UPDATED}
        </p>
      </header>

      <div className="prose-gmm space-y-10 text-[15px] leading-7 text-[#3b3b37]">
        <Section title="1. Welcome">
          <p>
            These Terms of Service ("Terms") govern your use of{" "}
            <strong>gomotivateme.com</strong> (the "Service") operated by
            GoMotivateMe ("we," "us," or "our"). By creating an account or
            using the Service, you agree to these Terms.
          </p>
          <p>
            If you don't agree, please don't use the Service. The Service is
            free — no payments, no subscriptions — but using it means
            accepting these rules.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use the Service. If you're
            using the Service on behalf of an organization, you represent
            that you have authority to bind that organization to these
            Terms.
          </p>
        </Section>

        <Section title="3. Your account">
          <p>
            You're responsible for what happens under your account. Use a
            strong password, don't share it, and keep your contact email
            current. If you suspect someone has accessed your account,
            change your password immediately and let us know at{" "}
            <a href="mailto:hello@gomotivateme.com">hello@gomotivateme.com</a>.
          </p>
          <p>
            We may suspend or terminate accounts that violate these Terms
            or that we reasonably believe pose a risk to the Service or
            other users.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>The Service is for real encouragement, not abuse. You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>Harass, threaten, or impersonate another person.</li>
            <li>
              Post content that is hateful, violent, sexually explicit, or
              promotes self-harm.
            </li>
            <li>
              Spam, scrape, or use bots, except as permitted by our public
              APIs (none today).
            </li>
            <li>
              Post content that is misleading, fraudulent, or that infringes
              someone else's rights.
            </li>
            <li>
              Use the Service to advertise, sell, or promote commercial
              products. The Service is not a marketplace.
            </li>
            <li>
              Try to reverse-engineer, bypass rate limits, or otherwise
              compromise the Service's security.
            </li>
            <li>
              Post content about weight, body image, eating, or recovery that
              could be harmful — even with good intentions. We have specific
              guidance for these categories.
            </li>
          </ul>
          <p>
            We moderate reported content and may remove it, hide it, or
            restrict the author's account. Repeated violations get you
            removed.
          </p>
        </Section>

        <Section title="5. Your content">
          <p>
            <strong>You own what you post.</strong> You retain all rights to
            the goals, updates, messages, and other content you create on
            the Service.
          </p>
          <p>
            <strong>You give us a limited license to run the Service.</strong>{" "}
            You grant GoMotivateMe a non-exclusive, worldwide, royalty-free
            license to host, store, reproduce, modify (for formatting and
            display), and distribute your content solely to operate the
            Service. This license ends when you delete the content, except
            for content that was already shared publicly (we keep cached
            copies until they expire).
          </p>
          <p>
            <strong>You confirm you have the right to post it.</strong> Don't
            post other people's content without permission, and don't post
            anything you agreed to keep confidential elsewhere.
          </p>
          <p>
            <strong>We may remove content.</strong> We may remove or restrict
            access to content that violates these Terms, our Community
            Guidelines, or that we believe (in good faith) is unlawful.
          </p>
        </Section>

        <Section title="6. Our content">
          <p>
            The Service itself — the code, design, copy, illustrations, and
            brand — is owned by GoMotivateMe. You can use the Service and
            link to it freely, but don't scrape, copy, or repackage our
            content without permission.
          </p>
        </Section>

        <Section title="7. Sensitive categories">
          <p>
            Some categories on the Service deal with topics where casual
            encouragement can be actively harmful — for example, weight
            loss, eating, recovery, and mental health. We display a more
            careful prompt before you create these goals, and we ask that
            you read the in-app guidance before you post.
          </p>
          <p>
            GoMotivateMe is not a substitute for professional advice,
            therapy, or medical care. The Service is for peer
            encouragement, not clinical support.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            You can delete your account at any time from{" "}
            <Link href="/settings" className="text-[var(--color-primary)] underline">
              Settings
            </Link>
            . When you delete, we erase your account data within 30 days
            (some backups may take up to 90 days to roll off).
          </p>
          <p>
            We may suspend or terminate your account if you violate these
            Terms, with or without notice. We'll tell you why unless doing
            so would compromise the Service or other users.
          </p>
        </Section>

        <Section title="9. Disclaimers">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." WE DISCLAIM
            ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            AND NON-INFRINGEMENT.
          </p>
          <p>
            We don't promise the Service will be uninterrupted, secure, or
            error-free. We don't promise any specific outcome (a goal
            reached, a connection made, a feeling improved). The Service is
            a tool; the outcomes are up to you and the people you bring into
            it.
          </p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, GOMOTIVATEME WILL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, OR DATA,
            ARISING FROM YOUR USE OF THE SERVICE.
          </p>
          <p>
            Our total liability for any claim relating to the Service is
            limited to the greater of (a) the amount you paid us in the 12
            months before the claim (which, since the Service is free, is
            $0) and (b) $100 USD.
          </p>
        </Section>

        <Section title="11. Indemnification">
          <p>
            You agree to indemnify and hold harmless GoMotivateMe and its
            team from any claims, damages, or expenses (including reasonable
            attorneys' fees) arising from your use of the Service, your
            content, or your violation of these Terms.
          </p>
        </Section>

        <Section title="12. Governing law and disputes">
          <p>
            These Terms are governed by the laws of Ireland, without regard
            to conflict-of-laws principles.
          </p>
          <p>
            We'll try to resolve any dispute informally first — email us at{" "}
            <a href="mailto:hello@gomotivateme.com">hello@gomotivateme.com</a>{" "}
            and we'll do our best to work it out within 30 days. If we can't,
            disputes will be resolved in the courts of Ireland.
          </p>
        </Section>

        <Section title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. If we make a
            material change, we'll let you know by email (if you have an
            account) and by posting a notice on the Service. The "Last
            updated" date at the top of this page will change too.
          </p>
          <p>
            If you keep using the Service after a change takes effect, you
            accept the new Terms. If you don't, you can delete your account
            at any time.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Questions? Email us at{" "}
            <a href="mailto:hello@gomotivateme.com">hello@gomotivateme.com</a>.
          </p>
        </Section>

        <Footnote>
          <p>
            This document is a starting point, not legal advice. We're a
            small team and not lawyers. If you're a business or organization
            considering using the Service in a regulated context, please get
            your own legal review. Plain-English summaries are at{" "}
            <Link href="/legal/community-guidelines" className="text-[var(--color-primary)] underline">
              Community Guidelines
            </Link>
            .
          </p>
        </Footnote>
      </div>
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

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border border-[#e9e7df] bg-[#f6f4ec] p-5 text-sm leading-6 text-[#656660]">
      {children}
    </aside>
  );
}
