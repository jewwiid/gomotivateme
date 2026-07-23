import Link from "next/link";
import { Logo } from "@/components/Logo";

const columns = [
  {
    title: "Explore",
    links: [
      ["Explore goals", "/explore"],
      ["How it works", "/#how-it-works"],
      ["Goal ideas", "/dashboard/new"],
    ],
  },
  {
    title: "Start a goal",
    links: [
      ["Create a goal", "/dashboard/new"],
      ["Build your team", "/#how-it-works"],
      ["Share progress", "/dashboard/new"],
    ],
  },
  {
    title: "About",
    links: [
      ["Our approach", "/#how-it-works"],
      ["Community guidelines", "/legal/community-guidelines"],
      ["Contact", "mailto:hello@gomotivateme.com"],
    ],
  },
];

// Social links — kept here so they're a single source of truth for the
// footer AND the head <link rel="me"> tags we'll add later for SEO.
const socials = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/gomotivate.me/",
    label: "Follow us on Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@gomotivateme",
    label: "Follow us on TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.18a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.61z" />
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-[#fffdf8] px-5 pt-16 sm:px-8 sm:pt-20">
      <div className="mx-auto grid max-w-[80rem] gap-10 border-b border-[#e3e1d8] pb-14 md:grid-cols-[1.35fr_repeat(3,1fr)]">
        <div>
          <Logo href="/" height={30} />
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#676862]">
            Real goals. Real people. Together.
          </p>
          {/* Social icons right under the tagline — the "above the
              fold of the footer" so they're seen without scrolling
              to the legal strip. */}
          <ul className="mt-5 flex items-center gap-3" aria-label="Social links">
            {socials.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#656660] transition hover:bg-[#f0eee5] hover:text-[var(--color-primary)]"
                >
                  <span className="block h-[18px] w-[18px]">{s.icon}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-bold text-[#33332f]">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-[#656660]">
              {column.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition hover:text-[var(--color-primary)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[80rem] flex-col gap-4 py-7 text-xs text-[#74756f] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} GoMotivateMe</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/legal/privacy" className="transition hover:text-[var(--color-primary)]">
            Privacy
          </Link>
          <Link href="/legal/cookies" className="transition hover:text-[var(--color-primary)]">
            Cookies
          </Link>
          <Link href="/legal/terms" className="transition hover:text-[var(--color-primary)]">
            Terms
          </Link>
          <Link href="/legal/community-guidelines" className="transition hover:text-[var(--color-primary)]">
            Community guidelines
          </Link>
        </div>
      </div>
    </footer>
  );
}
