import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const primaryLinks = [
  ["Explore goals", "/explore"],
  ["How it works", "/#how-it-works"],
  ["Start a goal", "/dashboard/new"],
  ["Community guidelines", "/legal/community-guidelines"],
] as const;

const legalLinks = [
  ["Privacy", "/legal/privacy"],
  ["Cookies", "/legal/cookies"],
  ["Terms", "/legal/terms"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 sm:px-8">
      <div className="shell-content grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end md:py-16">
        <div>
          <Wordmark href="/" size="xl" />
          <p className="mt-5 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
            A public place for the goals that matter—and the people helping you keep them.
          </p>
        </div>

        <div className="md:text-right">
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium md:justify-end">
              {primaryLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="transition hover:text-[var(--color-primary)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-[var(--color-text-muted)] md:justify-end">
            <a href="mailto:hello@gomotivateme.com" className="transition hover:text-[var(--color-primary)]">Email</a>
            <a href="https://www.instagram.com/gomotivate.me/" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-primary)]">Instagram ↗</a>
            <a href="https://www.tiktok.com/@gomotivateme" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-primary)]">TikTok ↗</a>
          </div>
        </div>
      </div>

      <div className="shell-content flex flex-col gap-4 border-t border-[var(--color-border)] py-6 font-mono text-[11px] text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} GoMotivateMe</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {legalLinks.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-[var(--color-primary)]">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
