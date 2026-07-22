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
      ["Community standards", "/explore"],
      ["Contact", "mailto:hello@gomotivateme.com"],
    ],
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
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Community guidelines</a>
        </div>
      </div>
    </footer>
  );
}
