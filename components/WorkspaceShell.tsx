"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
  asideFooter,
  children,
}: {
  items: WorkspaceNavItem[];
  ariaLabel?: string;
  asideFooter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[96rem] lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="border-b border-[var(--color-border)] bg-[var(--color-bg)] lg:sticky lg:top-[4.25rem] lg:flex lg:h-[calc(100vh-4.25rem)] lg:flex-col lg:border-b-0 lg:border-r">
        <nav
          aria-label={ariaLabel}
          className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-7 lg:py-7"
        >
          {items.map(({ label, href, icon: Icon, active, external }) => (
            <a
              key={`${href}-${label}`}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className={`group inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--color-primary-soft)]/55 text-[var(--color-primary)]"
                  : "text-[#33342f] hover:bg-[#f2f0e8] hover:text-[var(--color-primary)]"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
                aria-hidden
                className={active ? "text-[var(--color-primary)]" : "text-[#474944]"}
              />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        {asideFooter ? (
          <div className="mt-auto hidden border-t border-[var(--color-border)] p-7 lg:block">
            {asideFooter}
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 px-4 py-5 sm:px-6 lg:py-5 lg:pl-5 lg:pr-4">
        {children}
      </div>
    </div>
  );
}
