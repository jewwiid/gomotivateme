"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ComponentType, SVGProps } from "react";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Wordmark } from "@/components/Wordmark";
import { NotificationBell } from "@/components/NotificationBell";

export function Header({
  previewUser,
}: {
  previewUser?: {
    name: string;
    handle?: string;
    image?: string | null;
  };
} = {}) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useCurrentUser();
  const { signOut } = useAuthActions();
  const visibleUser = user ?? previewUser;
  const hasAccount = Boolean((isAuthenticated && user) || previewUser);

  const isExplore = pathname?.startsWith("/explore");
  const isAbout = pathname?.startsWith("/about");
  const isFaq = pathname?.startsWith("/faq");
  const isStories = pathname?.startsWith("/stories");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isMotivate = pathname?.startsWith("/motivate");
  const isSettings = pathname?.startsWith("/settings");
  const accountLabel =
    visibleUser?.name?.split(" ")[0] || visibleUser?.handle || "Account";
  const startGoalHref = visibleUser ? "/dashboard/new" : "/signup";

  // ── Avatar dropdown state ──────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen && !navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setNavOpen(false);
        if (menuOpen) triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setMenuOpen(false);
    if (previewUser) return;
    try {
      await signOut();
    } catch {
      // swallow — settings page handles its own sign-out flow with error UI
    }
    if (typeof window !== "undefined") window.location.href = "/";
  }

  // Menu items, in order shown in the dropdown
  type MenuItem = {
    href: string;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;
    active: boolean;
    visible: boolean;
  };
  const primaryLinks = [
    { href: "/explore", label: "Explore", active: isExplore },
    { href: "/stories", label: "Journeys", active: isStories },
    { href: "/#how-it-works", label: "How it works", active: false },
    { href: "/about", label: "About", active: isAbout },
    { href: "/faq", label: "FAQ", active: isFaq },
  ] as const;

  const menuItems: MenuItem[] = [
    {
      href: "/dashboard",
      label: "My goals",
      icon: LayoutDashboard,
      active: isDashboard && !pathname?.startsWith("/dashboard/supporting"),
      visible: true,
    },
    {
      href: "/dashboard/supporting",
      label: "Supporting",
      icon: Heart,
      active: !!pathname?.startsWith("/dashboard/supporting"),
      visible: true,
    },
    {
      href: "/motivate",
      label: "My circle",
      icon: Users,
      active: isMotivate,
      visible: true,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: SettingsIcon,
      active: isSettings,
      visible: true,
    },
  ];

  return (
    <motion.header
      className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)]/90 backdrop-blur-xl"
    >
      <div className="shell-app flex h-[4.75rem] items-center gap-3 px-5 sm:px-6 md:gap-7">
        <Wordmark size="lg" ariaLabel="GoMotivateMe — home" />

        <nav
          aria-label="Primary navigation"
          className="hidden h-full items-center gap-7 text-sm font-medium text-[var(--color-text-secondary)] md:flex"
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative inline-flex h-full items-center transition hover:text-[var(--color-text)] ${
                link.active
                  ? "text-[var(--color-text)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--color-primary)]"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-label="Account navigation"
          className="ml-auto flex shrink-0 items-center justify-end gap-4 text-sm font-medium text-[var(--color-text)]"
        >
          {hasAccount && visibleUser ? (
            <>
              <Link
                href={startGoalHref}
                className="hidden min-h-10 items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:translate-y-0 sm:inline-flex"
              >
                New goal
              </Link>
              <NotificationBell />
              <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Open account menu for ${accountLabel}`}
                className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
              >
                <AvatarBubble
                  image={visibleUser.image ?? null}
                  name={visibleUser.name ?? visibleUser.handle ?? "?"}
                />
                <span className="hidden sm:inline">{accountLabel}</span>
                <ChevronDown
                  size={13}
                  strokeWidth={1.8}
                  aria-hidden
                  className={`transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    role="menu"
                    aria-label="Account menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden workspace-card"
                  >
                    {/* User identity strip — small, so the menu still works on
                        narrow viewports where the name next to the avatar is
                        hidden. */}
                    <div className="flex items-center gap-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3.5 py-3">
                      <AvatarBubble
                        image={visibleUser.image ?? null}
                        name={visibleUser.name ?? visibleUser.handle ?? "?"}
                        size={9}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                          {visibleUser.name ?? accountLabel}
                        </p>
                        {visibleUser.handle ? (
                          <p className="truncate text-xs text-[var(--color-text-muted)]">
                            @{visibleUser.handle}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <ul className="py-1.5">
                      {menuItems
                        .filter((i) => i.visible)
                        .map(({ href, label, icon: Icon, active }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              role="menuitem"
                              className={`group flex items-center gap-3 px-3.5 py-2.5 text-sm transition ${
                                active
                                  ? "bg-[var(--color-primary-soft)]/60 text-[var(--color-primary)]"
                                  : "text-[var(--color-text)] hover:bg-[var(--color-bg-elev)]"
                              }`}
                            >
                              <span
                                className={`grid h-7 w-7 place-items-center rounded-[2px] ${
                                  active
                                    ? "bg-[var(--color-primary)] text-white"
                                    : "bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)] group-hover:bg-[var(--color-gold-soft)]"
                                }`}
                              >
                                <Icon size={15} strokeWidth={1.8} aria-hidden />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {active ? (
                                <span className="h-px w-3 bg-[var(--color-primary)]" />
                              ) : null}
                            </Link>
                          </li>
                        ))}
                    </ul>

                    <div className="border-t border-[var(--color-border-subtle)] py-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger-text)]"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-[2px] bg-[var(--color-bg-elev)] text-[var(--color-text-secondary)] group-hover:bg-[var(--color-danger-soft)]">
                          <LogOut size={15} strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="flex-1 text-left font-medium">
                          Sign out
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="transition hover:text-[var(--color-primary)]"
              >
                Sign in
              </Link>
              <Link
                href={startGoalHref}
                className="hidden min-h-10 items-center rounded-full bg-[var(--color-text)] px-5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-primary)] active:translate-y-0 sm:inline-flex"
              >
                Start a goal
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-bg-elev)] md:hidden"
            aria-expanded={navOpen}
            aria-controls="mobile-primary-nav"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMenuOpen(false);
              setNavOpen((open) => !open);
            }}
          >
            {navOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
        </nav>
      </div>
      <AnimatePresence>
        {navOpen ? (
          <motion.nav
            id="mobile-primary-nav"
            aria-label="Mobile primary navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-[var(--color-border-subtle)] bg-[var(--color-bg)] md:hidden"
          >
            <ul className="flex flex-col px-5 py-3">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex min-h-12 items-center text-base font-medium ${
                      link.active ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={startGoalHref}
                  className="mt-2 mb-1 flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white"
                >
                  Start a goal
                </Link>
              </li>
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

export function PageHeader({ children }: { children: React.ReactNode }) {
  return <header className="mb-8">{children}</header>;
}

export function UserBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]">
      <UserIcon size={12} />
      Owner
    </span>
  );
}

/**
 * Tiny avatar slot used in the header (and the dropdown identity strip).
 * Shows the user's image when available, with an onError fallback to the
 * initials chip so a broken/expired Convex storage URL doesn't render a
 * browser broken-image icon. `key` is included so a fresh URL (after
 * re-upload) gets a fresh img element instead of a cached error.
 */
function AvatarBubble({
  image,
  name,
  size = 6,
}: {
  image: string | null;
  name: string;
  size?: 6 | 9;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = image && !errored;

  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const dim = size === 9 ? "h-9 w-9 text-xs" : "h-6 w-6 text-[10px]";
  const imgDim = size === 9 ? "h-9 w-9" : "h-6 w-6";

  if (!showImage) {
    return (
      <span
        className={`grid place-items-center rounded-full bg-[var(--color-bg-elev)] font-bold text-[var(--color-text-secondary)] ${dim}`}
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={image}
      src={image}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={`${imgDim} rounded-full object-cover`}
    />
  );
}
