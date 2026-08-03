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
  children,
}: {
  items: WorkspaceNavItem[];
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="shell-app">
      <div className="sticky top-[4.25rem] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
        <nav
          aria-label={ariaLabel}
          className="flex gap-7 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8"
        >
          {items.map(({ label, href, active, external }) => (
            <a
              key={`${href}-${label}`}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className={`relative inline-flex min-h-13 shrink-0 items-center gap-2 py-2 text-sm font-medium transition ${
                active
                  ? "text-[var(--color-text)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <span>{label}</span>
              {external ? <span className="font-mono text-[10px]" aria-hidden>↗</span> : null}
            </a>
          ))}
        </nav>
      </div>

      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </div>
    </div>
  );
}
