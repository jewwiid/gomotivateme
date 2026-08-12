import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  alternates: { canonical: "/legal/cookies" },
  description: "What browser storage GoMotivateMe uses, why, and how to manage it.",
};

const STORAGE = [
  {
    name: "Convex Auth session storage and cookies",
    provider: "GoMotivateMe / Convex",
    purpose: "Authenticates your account, keeps you signed in, and protects sign-in flows.",
    category: "Essential",
    duration: "Session or account session",
  },
  {
    name: "gomotivateme.visitorKey",
    provider: "GoMotivateMe",
    purpose: "Local browser identifier used to prevent duplicate reactions. Stored in localStorage, not a cookie.",
    category: "Functional",
    duration: "Until you clear site data",
  },
  {
    name: "gomotivateme.cookieConsent",
    provider: "GoMotivateMe",
    purpose: "Remembers whether you accepted or rejected optional analytics. Stored in localStorage.",
    category: "Essential",
    duration: "Until the notice changes or you clear site data",
  },
  {
    name: "datafast_visitor_id",
    provider: "DataFast",
    purpose: "Recognises the same consenting browser across visits for analytics and attribution.",
    category: "Analytics — optional",
    duration: "1 year",
  },
  {
    name: "datafast_visitor_first_seen_at",
    provider: "DataFast",
    purpose: "Records when a consenting browser was first seen.",
    category: "Analytics — optional",
    duration: "1 year",
  },
  {
    name: "datafast_visitor_session_count",
    provider: "DataFast",
    purpose: "Counts sessions from a consenting browser.",
    category: "Analytics — optional",
    duration: "1 year",
  },
  {
    name: "datafast_session_id",
    provider: "DataFast",
    purpose: "Groups analytics activity into a browser session.",
    category: "Analytics — optional",
    duration: "30 minutes; refreshed during activity",
  },
] as const;

export default function CookiePolicyPage() {
  return (
    <article className="prose-custom">
      <p className="brand-kicker">Legal</p>
      <h1 className="mt-2 title-page">Cookie Policy</h1>
      <p className="mt-3 text-sm text-[var(--color-text-dim)]">Last updated: 12 August 2026</p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">In short</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          We use essential browser storage to run the Service. DataFast analytics
          is optional and its script does not load until you select <strong>Accept
          analytics</strong>. Rejecting it does not limit the Service. We do not use
          advertising cookies or cross-site ad tracking.
        </p>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          This policy applies on our owned domains, including gomotivate.me and
          gomotivateme.com.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">What these technologies are</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Cookies are small text files stored by your browser. Local storage is a
          similar browser feature, but its values are not sent automatically with
          every web request. Under Irish and EU rules, strictly necessary storage
          can be used without consent; optional analytics is held back until you
          make an affirmative choice.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Storage we use</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--color-border)]">
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Name</th>
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Provider</th>
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Purpose</th>
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Category</th>
                <th className="py-2 font-semibold text-[var(--color-text)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE.map((item) => (
                <tr key={item.name} className="border-b border-[var(--color-border)] align-top">
                  <td className="break-all py-2 pr-3 font-mono text-xs text-[var(--color-text-muted)]">{item.name}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{item.provider}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{item.purpose}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{item.category}</td>
                  <td className="py-2 text-[var(--color-text-muted)]">{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">What DataFast measures</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          If you consent, DataFast receives page URLs, referrers and campaign
          parameters, browser and device information, screen and viewport size,
          language, timezone, IP-derived location, its pseudonymous visitor and
          session identifiers, external-link destinations and link text, and selected
          product actions such as account creation, creating a goal, posting progress,
          or joining a support team. Page URLs can include public handles and goal slugs.
        </p>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Our custom analytics events do not include your email address, name, goal
          title, goal story, update text, support message, or other free-form content.
          We also suppress DataFast on verification, password-confirmation,
          unsubscribe, and invitation-token URLs.
        </p>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          DataFast acts as our analytics processor. You can read its{" "}
          <a href="https://datafa.st/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
            privacy information
          </a>{" "}
          and{" "}
          <a href="https://datafa.st/dpa" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
            data processing terms
          </a>.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Change or withdraw your choice</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Use <strong>Cookie settings</strong> in the footer on any page. Rejecting
          optional analytics stops DataFast, removes its cookies from this site, and
          reloads the page to remove the active tracker. You can accept again later.
          You can also clear site data in your browser; clearing authentication data
          may sign you out.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Third-party content</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Goal owners may share YouTube, TikTok, or Instagram links. Opening or
          playing third-party content may let that provider use its own storage under
          its own policy. We do not control those providers.
        </p>
      </section>

      <section className="mt-10 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-dim)]">
        Questions? <Link href="/legal/privacy" className="text-[var(--color-primary)] hover:underline">Read our Privacy Policy</Link>{" "}
        or email <a href="mailto:privacy@gomotivateme.com" className="text-[var(--color-primary)] hover:underline">privacy@gomotivateme.com</a>.
      </section>
    </article>
  );
}
