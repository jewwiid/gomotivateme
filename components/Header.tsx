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
  Search,
  Settings as SettingsIcon,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useCurrentUser();
  const { signOut } = useAuthActions();

  const isExplore = pathname?.startsWith("/explore");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isMotivate = pathname?.startsWith("/motivate");
  const isSettings = pathname?.startsWith("/settings");
  const accountLabel = user?.name?.split(" ")[0] || user?.handle || "Account";
  const startGoalHref = user ? "/dashboard/new" : "/signup";

  // ── Avatar dropdown state ──────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setMenuOpen(false);
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
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-[#e9e7df] bg-[#fffdf8]/95 backdrop-blur"
    >
      <div className="relative mx-auto flex h-[4.25rem] max-w-[50rem] items-center px-5 sm:px-6">
        {/* Primary nav (public, hidden on mobile) */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-5 text-sm font-medium text-[#31312e] md:flex"
        >
          <Link
            href="/explore"
            className={`inline-flex items-center gap-1.5 transition hover:text-[var(--color-primary)] ${
              isExplore ? "text-[var(--color-primary)]" : ""
            }`}
          >
            <Search size={14} strokeWidth={1.9} aria-hidden />
            Explore
          </Link>
          <Link
            href="/#how-it-works"
            className="transition hover:text-[var(--color-primary)]"
          >
            How it works
          </Link>
          <Link
            href={startGoalHref}
            className="hidden transition hover:text-[var(--color-primary)] lg:inline-flex"
          >
            Start a goal
          </Link>
        </nav>

        <Wordmark
          size="xl"
          ariaLabel="GoMotivateMe — home"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        {/* Account / avatar nav */}
        <nav
          aria-label="Account navigation"
          className="ml-auto flex items-center gap-4 text-sm font-medium text-[#31312e]"
        >
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Open account menu for ${accountLabel}`}
                className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 transition hover:bg-[#f0eee5] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
              >
                <AvatarBubble
                  image={user.image}
                  name={user.name ?? user.handle ?? "?"}
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
                    className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-[#e9e7df] bg-white shadow-[0_18px_40px_-12px_rgba(31,31,27,0.18),0_4px_10px_-2px_rgba(31,31,27,0.08)]"
                  >
                    {/* User identity strip — small, so the menu still works on
                        narrow viewports where the name next to the avatar is
                        hidden. */}
                    <div className="flex items-center gap-2.5 border-b border-[#efeee7] bg-[#fafaf6] px-3.5 py-3">
                      <AvatarBubble
                        image={user.image}
                        name={user.name ?? user.handle ?? "?"}
                        size={9}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1f1f1c]">
                          {user.name ?? accountLabel}
                        </p>
                        {user.handle ? (
                          <p className="truncate text-xs text-[#7a7c75]">
                            @{user.handle}
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
                                  : "text-[#2d2e29] hover:bg-[#f4f2ea]"
                              }`}
                            >
                              <span
                                className={`grid h-7 w-7 place-items-center rounded-lg ${
                                  active
                                    ? "bg-[var(--color-primary)] text-white"
                                    : "bg-[#f4f2ea] text-[#5d5e58] group-hover:bg-[#ecead8]"
                                }`}
                              >
                                <Icon size={15} strokeWidth={1.8} aria-hidden />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {active ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                              ) : null}
                            </Link>
                          </li>
                        ))}
                    </ul>

                    <div className="border-t border-[#efeee7] py-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-[#2d2e29] transition hover:bg-[#fdecec] hover:text-[#c44343]"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f4f2ea] text-[#5d5e58] group-hover:bg-[#fdecec]">
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
          ) : (
            <Link
              href="/login"
              className="transition hover:text-[var(--color-primary)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
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
        className={`grid place-items-center rounded-full bg-[#f0efe9] font-bold text-[#4d4e48] ${dim}`}
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
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={`${imgDim} rounded-full object-cover`}
    />
  );
}
