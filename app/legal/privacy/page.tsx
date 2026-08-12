import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/legal/privacy" },
  description:
    "What gomotivateme.com collects, why, and what you can do about it.",
};

const LAST_UPDATED = "August 12, 2026";
const EFFECTIVE = "August 12, 2026";

export default function PrivacyPage() {
  return (
    <article className="space-y-10">
      <header className="border-b border-[var(--color-border)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
          Legal
        </p>
        <h1 className="mt-2 title-page">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Effective {EFFECTIVE} · Last updated {LAST_UPDATED}
        </p>
      </header>

      <p className="workspace-card-soft p-5 text-sm leading-6 text-[var(--color-text)]">
        <strong>The short version.</strong> We collect the minimum data we
        need to run gomotivateme.com: an email, a password (hashed), the
        goals and messages you create, and basic usage data to keep the
        Service working. Optional DataFast analytics runs only with your
        consent. We don't sell your data. We don't show you ads. You can
        export or delete your account anytime.
      </p>

      <div className="space-y-10 text-[15px] leading-7 text-[var(--color-text)]">
        <Section title="1. What we collect">
          <p>We collect the following categories of information:</p>

          <SubSection title="Account information">
            <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
              <li>
                <strong>Email address</strong>: used for sign-in and
                important service notifications (password reset, security
                alerts, account changes). Never used for marketing without
                explicit opt-in.
              </li>
              <li>
                <strong>Display name</strong>: what other users see.
              </li>
              <li>
                <strong>Handle</strong>: your public profile URL (e.g.
                gomotivateme.com/u/your-handle). Optional.
              </li>
              <li>
                <strong>Profile photo and cover image</strong>: optional.
                Stored on our file storage and served via our CDN.
              </li>
              <li>
                <strong>Password</strong>: stored only as a one-way hash
                (scrypt). We can't see your password and we can't recover
                it: we can only reset it.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Content you create">
            <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
              <li>Goals (title, summary, target, category, cover image)</li>
              <li>Progress updates and milestone toggles</li>
              <li>
                Support messages, reactions, and emoji on others' goals
                (when you're a motivator or supporter)
              </li>
              <li>
                Profile bio and any other fields you fill in
              </li>
            </ul>
          </SubSection>

          <SubSection title="Usage data">
            <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
              <li>
                <strong>Authentication logs</strong>: sign-in times, IP
                addresses, user agent strings. Used for security and abuse
                detection, retained for 90 days.
              </li>
              <li>
                <strong>Email events</strong>: we store queue and delivery
                status for emails we send. Our provider, Resend, may also
                process delivery, open, click, bounce, and complaint metadata
                for deliverability and campaign reporting.
              </li>
              <li>
                <strong>Optional website analytics</strong>: after you consent,
                DataFast processes page URLs, referrers and campaign parameters,
                browser and device information, language, timezone, screen and
                viewport size, IP-derived location, pseudonymous visitor/session
                identifiers, external-link destination and link text, and selected
                product actions. Page URLs can contain public handles and goal slugs.
                We do not identify your DataFast profile with your account, name, or
                email address.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Data we do NOT collect">
            <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
              <li>
                <strong>No advertising trackers.</strong> No Facebook pixel,
                no Google Analytics with cross-site tracking, no ad
                networks. We don't sell ads.
              </li>
              <li>
                <strong>No payment data.</strong> The Service is free. We
                don't process payments, so we don't see card numbers, bank
                accounts, or anything similar.
              </li>
              <li>
                <strong>No precise location tracking.</strong> Service providers
                may derive an approximate country or region from your IP for
                security, localisation, delivery, and—only after analytics
                consent—traffic reporting. We do not collect GPS location.
              </li>
            </ul>
          </SubSection>
        </Section>

        <Section title="2. How we use your data">
          <p>We use the data we collect to:</p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
            <li>Operate, secure, and improve the Service.</li>
            <li>
              With your consent, measure traffic sources, page use, and a
              deliberately limited set of conversion events so we can understand
              which parts of the Service help people return and make progress.
            </li>
            <li>
              Send you transactional emails (password reset, security
              alerts, account changes, goal-related notifications you've
              opted into).
            </li>
            <li>
              Send goal activity summaries and accountability reminders
              according to the choices in your email settings.
            </li>
            <li>
              Send the optional Discover newsletter featuring approved public
              goals only after you affirmatively choose Daily or Weekly. It is
              off by default and can be turned off at any time.
            </li>
            <li>
              Feature content from approved public goals in discovery surfaces,
              including the optional Discover newsletter. Private, unlisted,
              anonymous, rejected, and sensitive-category goals are excluded
              from that newsletter.
            </li>
            <li>
              Investigate abuse, violations of our{" "}
              <Link
                href="/legal/community-guidelines"
                className="text-[var(--color-primary)] underline"
              >
                Community Guidelines
              </Link>
              , or illegal activity.
            </li>
            <li>
              Respond to legal requests when required (see Section 8).
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use your data for automated
            decision-making that meaningfully affects you (e.g. credit
            scoring, insurance). We don't profile you for advertising. We
            don't sell it.
          </p>
          <SubSection title="Our legal bases">
            <p>
              Where the GDPR applies, we process account and content data to perform
              our contract with you; security and service-improvement data for our
              legitimate interests in operating a safe, reliable Service; records we
              must keep to comply with law; and optional analytics and marketing only
              on the basis of consent. You can withdraw consent without affecting the
              lawfulness of processing that occurred before withdrawal.
            </p>
          </SubSection>
        </Section>

        <Section title="3. Who we share it with">
          <p>
            We do not sell, rent, or trade your personal information. We
            share it only with the following categories of recipients, and
            only what's necessary:
          </p>

          <SubSection title="Service providers (data processors)">
            <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
              <li>
                <strong>Convex</strong>: our database and authentication
                provider. They store your account data, your content, and
                session tokens. (Data processing agreement in place.)
              </li>
              <li>
                <strong>Resend</strong>: our transactional and lifecycle
                email provider. They see your email address and the emails
                we send you.
              </li>
              <li>
                <strong>Vercel</strong>: our web host. They see HTTP
                requests to gomotivateme.com, including your IP address.
                They do not see authenticated content (the app talks to
                Convex directly from your browser).
              </li>
              <li>
                <strong>Cloudflare</strong>: DNS and (for our custom
                domain) edge proxy. They see request metadata, not your
                content.
              </li>
              <li>
                <strong>DataFast</strong>: our optional website analytics
                processor. After consent, it receives pseudonymous browser,
                traffic, page, device, approximate location, and limited custom
                event data. Our custom event properties do not include your email,
                name, goal text, update text, or support messages. See DataFast's{" "}
                <a href="https://datafa.st/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                  privacy information
                </a>{" "}
                and{" "}
                <a href="https://datafa.st/dpa" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                  data processing terms
                </a>.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Other users">
            <p>
              Your public profile, public goals, and any messages you post
              on a public goal are visible to anyone who has the link. Your
              handle, name, and avatar are visible to other users on the
              Service.
            </p>
          </SubSection>

          <SubSection title="Legal requests">
            <p>
              We may disclose your information if required to do so by law
              or in the good-faith belief that such disclosure is necessary
              to comply with a legal obligation, protect our rights, or
              investigate potential violations. We'll notify you if
              legally permitted.
            </p>
          </SubSection>

          <SubSection title="Business transfers">
            <p>
              If GoMotivateMe is acquired or merges with another company,
              your information may be transferred as part of that deal. We'll
              notify you in advance.
            </p>
          </SubSection>
        </Section>

        <Section title="4. Cookies and local storage">
          <p>
            The Service uses essential browser storage for authentication,
            security, consent choices, and reaction integrity. With your permission,
            DataFast sets analytics cookies with durations ranging from 30 minutes
            to one year and loads its tracking script. It remains blocked if you
            reject analytics.
          </p>
          <p>
            You can change or withdraw that choice at any time through <strong>Cookie
            settings</strong> in the footer. Withdrawal stops the tracker and removes
            its cookies from this site. Our separate{" "}
            <Link href="/legal/cookies" className="text-[var(--color-primary)] underline">
              Cookie Policy
            </Link>{" "}
            lists the technologies, purposes, and durations in detail.
          </p>
        </Section>

        <Section title="5. International data transfers">
          <p>
            GoMotivateMe is operated from Ireland. Our service providers
            (Convex, Vercel, Resend, Cloudflare, and DataFast where you consent)
            may process data in the
            United States, the European Economic Area, or other regions.
          </p>
          <p>
            Where information is transferred outside the EEA, UK, or Switzerland,
            we use the safeguards made available by the relevant provider and our
            data processing agreements, which may include Standard Contractual
            Clauses. You can request more information by emailing us.
          </p>
        </Section>

        <Section title="6. Data retention">
          <p>
            We keep your account data for as long as your account is active.
            When you delete your account:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
            <li>
              Account profile, goals, updates, and messages are deleted
              from our primary database within 30 days.
            </li>
            <li>
              Backups are aged out within 90 days. Backups are encrypted
              and access-controlled.
            </li>
            <li>
              Analytics cookies expire after 30 minutes to one year. Analytics
              events are retained in our DataFast account according to our active
              service plan and deletion settings, or deleted earlier when required
              to honour a valid request.
            </li>
            <li>
              Some records may be retained longer if we have a legal
              obligation (e.g. tax records, abuse investigations).
            </li>
          </ul>
        </Section>

        <Section title="7. Your rights">
          <p>
            You can do the following at any time (most are one-click in{" "}
            <Link href="/settings" className="text-[var(--color-primary)] underline">
              Settings
            </Link>
            ):
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-text-dim)]">
            <li>
              <strong>Access</strong>: request a copy of your data (we'll
              email you a JSON + CSV export within 7 days).
            </li>
            <li>
              <strong>Correct</strong>: update your email, name, handle,
              bio, or any other profile field.
            </li>
            <li>
              <strong>Delete</strong>: delete your account. Your data is
              removed per Section 6.
            </li>
            <li>
              <strong>Restrict processing</strong>: ask us to stop using
              your data for a specific purpose (e.g. disable analytics on
              your account).
            </li>
            <li>
              <strong>Object</strong>: if we ever use your data in a way
              you disagree with, you can object and we'll review.
            </li>
            <li>
              <strong>Port</strong>: export all your data in a
              machine-readable format.
            </li>
            <li>
              <strong>Withdraw consent</strong>: for any optional
              processing. Use Cookie settings for analytics; for marketing email,
              use the unsubscribe link in every message or the in-app email setting.
            </li>
            <li>
              <strong>Complain</strong>: if you're in the EU, you can
              also lodge a complaint with your local data protection
              authority. We'd prefer you email us first so we can try to
              fix it.
            </li>
          </ul>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard security practices: HTTPS everywhere,
            hashed passwords (scrypt with per-user salt), encrypted
            backups, principle-of-least-access for staff, and prompt
            patching of dependencies.
          </p>
          <p>
            No system is perfectly secure. If you discover a security
            issue, please email{" "}
            <a
              href="mailto:security@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              security@gomotivateme.com
            </a>
            . We respond to security reports within 48 hours and run a
            disclosure program as we grow.
          </p>
        </Section>

        <Section title="9. Children's privacy">
          <p>
            The Service is not directed at children under 13. We do not
            knowingly collect personal information from anyone under 13. If
            you believe a child under 13 has created an account, email{" "}
            <a
              href="mailto:hello@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              hello@gomotivateme.com
            </a>{" "}
            and we'll delete the account.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy. If we make a material change, we'll
            let you know by email and post a notice on the Service. The
            "Last updated" date at the top of this page will change too.
          </p>
          <p>
            If you keep using the Service after a change takes effect, you
            accept the new policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions or requests? Email{" "}
            <a
              href="mailto:hello@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              hello@gomotivateme.com
            </a>
            . We respond within 7 days.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            For data protection requests specifically (access, deletion,
            portability), please use{" "}
            <a
              href="mailto:privacy@gomotivateme.com"
              className="text-[var(--color-primary)] underline"
            >
              privacy@gomotivateme.com
            </a>{" "}
            so we can route them to the right person.
          </p>
        </Section>
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
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}
