import Link from "next/link";

export const metadata = {
  title: "Cookie Policy: gomotivateme",
  description: "What cookies gomotivateme sets, why, and how to manage them.",
};

export default function CookiePolicyPage() {
  return (
    <article className="prose-custom">
      <p className="brand-kicker">Legal</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
        Cookie Policy
      </h1>
      <p className="mt-3 text-sm text-[var(--color-text-dim)]">Last updated: 23 July 2026</p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">In short</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          We use <strong>only essential cookies</strong> to keep you signed in and the
          site working. We do <strong>not</strong> use analytics, advertising, or
          tracking cookies. No Google Analytics, no Facebook pixel, no cross-site
          tracking.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">What is a cookie?</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          A cookie is a small text file stored on your device when you visit a
          website. They&apos;re widely used to make websites work efficiently and to
          provide information to site owners. Under EU law (the ePrivacy Directive),
          cookies that are <em>strictly necessary</em> for the service you requested
          don&apos;t require consent. All the cookies we set fall into that category.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Cookies we set</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--color-border)]">
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Name</th>
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Purpose</th>
                <th className="py-2 pr-3 font-semibold text-[var(--color-text)]">Type</th>
                <th className="py-2 font-semibold text-[var(--color-text)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-[var(--color-border)]">
                  <td className="break-all py-2 pr-3 font-mono text-xs text-[var(--color-text-muted)]">
                    {c.name}
                  </td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{c.purpose}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-muted)]">{c.type}</td>
                  <td className="py-2 text-[var(--color-text-muted)]">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-dim)]">
          All auth cookies are <code className="rounded bg-[#f0efe9] px-1">httpOnly</code>,
          <code className="rounded bg-[#f0efe9] px-1">secure</code>, and
          <code className="rounded bg-[#f0efe9] px-1">sameSite=lax</code>: they can&apos;t
          be read by JavaScript or sent cross-site.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Cookies we DON&apos;T set</h2>
        <ul className="mt-3 space-y-2 leading-7 text-[var(--color-text-muted)]">
          <li>✕ No analytics cookies (no Google Analytics, Plausible, Mixpanel, etc.)</li>
          <li>✕ No advertising cookies (no Google Ads, Facebook pixel, etc.)</li>
          <li>✕ No social tracking (no LinkedIn Insight, TikTok pixel, etc.)</li>
          <li>✕ No cross-site tracking of any kind</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Third-party content</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Goal owners may post links to YouTube, TikTok, or Instagram videos as part of
          their updates. When you play one of these embedded videos, the platform
          (YouTube, TikTok, or Instagram) may set their own cookies. We don&apos;t
          control those: check their respective cookie policies for details.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Managing cookies</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          Since we only use essential cookies, there&apos;s nothing you need to opt out
          of. If you want to clear all cookies, you can do so in your browser settings:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-[var(--color-primary)]">
          <li>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Chrome →
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Safari →
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Firefox →
            </a>
          </li>
        </ul>
        <p className="mt-3 text-sm text-[var(--color-text-dim)]">
          Note: clearing the auth cookies will sign you out. You&apos;ll need to log back in.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-text)]">If we add analytics later</h2>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          If we ever introduce analytics or any non-essential cookies, we&apos;ll update
          this page, update our consent banner, and seek your explicit consent before
          setting them. We commit to never using advertising trackers.
        </p>
      </section>

      <section className="mt-10 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-dim)]">
        Questions?{" "}
        <Link href="/legal/privacy" className="text-[var(--color-primary)] hover:underline">
          See our Privacy Notice
        </Link>{" "}
        or email{" "}
        <a href="mailto:privacy@gomotivateme.com" className="text-[var(--color-primary)] hover:underline">
          privacy@gomotivateme.com
        </a>
        .
      </section>
    </article>
  );
}

const COOKIES = [
  {
    name: "__Host-__convexAuthJWT",
    purpose: "Keeps you signed in after login",
    type: "Essential",
    duration: "Session",
  },
  {
    name: "__Host-__convexAuthRefreshToken",
    purpose: "Refreshes your session so you stay logged in",
    type: "Essential",
    duration: "Session",
  },
  {
    name: "__Host-__convexAuthOAuthVerifier",
    purpose: "Security check during Google sign-in",
    type: "Essential",
    duration: "Transient (minutes)",
  },
  {
    name: "gomotivateme.visitorKey",
    purpose: "Prevents duplicate reactions (localStorage, not a cookie)",
    type: "Functional",
    duration: "Persistent",
  },
];
