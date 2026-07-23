import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy: GoMotivateMe",
  description:
    "What gomotivateme.com collects, why, and what you can do about it.",
};

const LAST_UPDATED = "July 22, 2026";
const EFFECTIVE = "July 22, 2026";

export default function PrivacyPage() {
  return (
    <article className="space-y-10">
      <header className="border-b border-[#e9e7df] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888983]">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#74756f]">
          Effective {EFFECTIVE} · Last updated {LAST_UPDATED}
        </p>
      </header>

      <p className="rounded-2xl border border-[#e9e7df] bg-[#f6f4ec] p-5 text-sm leading-6 text-[#3b3b37]">
        <strong>The short version.</strong> We collect the minimum data we
        need to run gomotivateme.com: an email, a password (hashed), the
        goals and messages you create, and basic usage data to keep the
        Service working. We don't sell your data. We don't show you ads.
        You can export or delete your account anytime.
      </p>

      <div className="space-y-10 text-[15px] leading-7 text-[#3b3b37]">
        <Section title="1. What we collect">
          <p>We collect the following categories of information:</p>

          <SubSection title="Account information">
            <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
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
            <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
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
            <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
              <li>
                <strong>Authentication logs</strong>: sign-in times, IP
                addresses, user agent strings. Used for security and abuse
                detection, retained for 90 days.
              </li>
              <li>
                <strong>Email events</strong>: delivery, open, click
                tracking for any emails we send you (only if you've opted
                into the relevant category). We use Resend as our email
                provider; they store the same metadata.
              </li>
              <li>
                <strong>Aggregated analytics</strong>: page views, feature
                usage, errors. Stored in aggregate form, not tied to your
                account unless we explicitly need to debug your account.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Data we do NOT collect">
            <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
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
                <strong>No location tracking.</strong> We use your IP
                country for timezone on the weekly digest, not for any
                other purpose.
              </li>
            </ul>
          </SubSection>
        </Section>

        <Section title="2. How we use your data">
          <p>We use the data we collect to:</p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>Operate, secure, and improve the Service.</li>
            <li>
              Send you transactional emails (password reset, security
              alerts, account changes, goal-related notifications you've
              opted into).
            </li>
            <li>
              Send you weekly digests and re-engagement emails (only if
              you haven't opted out of that category).
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
        </Section>

        <Section title="3. Who we share it with">
          <p>
            We do not sell, rent, or trade your personal information. We
            share it only with the following categories of recipients, and
            only what's necessary:
          </p>

          <SubSection title="Service providers (data processors)">
            <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
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
            The Service uses the browser's <code>localStorage</code> to
            persist your session token (so you stay signed in across page
            reloads). We do not set any tracking cookies or share cookie
            data with third parties.
          </p>
          <p>
            If we ever add analytics that require cookies, we'll update this
            policy and ask for your consent where required by law (e.g.
            under the ePrivacy Directive in the EU).
          </p>
        </Section>

        <Section title="5. International data transfers">
          <p>
            GoMotivateMe is operated from Ireland. Our service providers
            (Convex, Vercel, Resend, Cloudflare) may process data in the
            United States, the European Economic Area, or other regions.
          </p>
          <p>
            For transfers from the EEA, UK, or Switzerland to the United
            States, we rely on the European Commission's Standard
            Contractual Clauses and the provider's data processing
            agreements. You can request a copy by emailing us.
          </p>
        </Section>

        <Section title="6. Data retention">
          <p>
            We keep your account data for as long as your account is active.
            When you delete your account:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
            <li>
              Account profile, goals, updates, and messages are deleted
              from our primary database within 30 days.
            </li>
            <li>
              Backups are aged out within 90 days. Backups are encrypted
              and access-controlled.
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
          <ul className="list-disc space-y-2 pl-6 marker:text-[#888983]">
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
              processing, like marketing emails. Unsubscribe links are in
              every email, or use the in-app toggle.
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
          <p className="text-sm text-[#74756f]">
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
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f1f1c]">
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
      <h3 className="text-base font-semibold text-[#1f1f1c]">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}
