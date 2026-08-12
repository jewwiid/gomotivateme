"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type WorkspaceNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  external?: boolean;
};

export function WorkspaceShell({
  items,
  ariaLabel = "Goal workspace",
  children,
}: {
  items: WorkspaceNavItem[];
  ariaLabel?: string;
  children: ReactNode;
}) {
  const internalHrefs = useMemo(
    () => items.filter((item) => !item.external && item.href.startsWith("#")).map((item) => item.href),
    [items]
  );
  const hrefKey = internalHrefs.join("|");
  const navRef = useRef<HTMLElement>(null);
  const [activeHref, setActiveHref] = useState(
    () => items.find((item) => item.active)?.href ?? internalHrefs[0] ?? ""
  );

  useEffect(() => {
    const hrefs = hrefKey.split("|").filter(Boolean);
    if (hrefs.length === 0) return;

    let frame = 0;
    const updateFromScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const marker = 150;
        let next = hrefs[0];
        const existing = hrefs.filter((href) => document.getElementById(href.slice(1)));

        for (const href of existing) {
          const section = document.getElementById(href.slice(1));
          if (section && section.getBoundingClientRect().top <= marker) next = href;
        }

        // The final section often cannot reach the marker because there is no
        // page left beneath it. At the bottom, keep the last real section active.
        if (
          existing.length > 0 &&
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
        ) {
          next = existing[existing.length - 1];
        }

        setActiveHref(next);
      });
    };

    const hash = window.location.hash;
    if (hrefs.includes(hash)) setActiveHref(hash);
    updateFromScroll();
    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    window.addEventListener("hashchange", updateFromScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
      window.removeEventListener("hashchange", updateFromScroll);
    };
  }, [hrefKey]);

  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="location"]')
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeHref]);

  return (
    <div className="shell-app">
      <div className="sticky top-[4.75rem] z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)]/92 backdrop-blur-xl">
        <nav
          ref={navRef}
          aria-label={ariaLabel}
          className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:px-8"
        >
          {items.map(({ label, href, external }) => {
            const isActive = !external && activeHref === href;
            return (
              <a
                key={`${href}-${label}`}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                aria-current={isActive ? "location" : undefined}
                onClick={() => {
                  if (!external) setActiveHref(href);
                }}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--color-text)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
                }`}
              >
                <span>{label}</span>
                {external ? <span className="font-mono text-[10px]" aria-hidden>↗</span> : null}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </div>
    </div>
  );
}
