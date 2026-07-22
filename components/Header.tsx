"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Logo } from "@/components/Logo";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const { signOut } = useAuthActions();

  const onPublicPage = pathname?.startsWith("/o/");

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-[var(--color-border)] glass"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo href="/" height={32} />

        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link
            href="/explore"
            className={`rounded-md px-3 py-1.5 transition ${
              pathname?.startsWith("/explore")
                ? "bg-[var(--color-bg-card)] font-medium text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Explore
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
              >
                My goals
              </Link>
              <Link
                href="/motivate"
                className="rounded-md px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
              >
                Goals I motivate
              </Link>
              {user.handle && (
                <Link
                  href={`/u/${user.handle}`}
                  className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                >
                  My profile
                </Link>
              )}
              <Link
                href="/settings"
                className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text)]"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon size={16} />
              </Link>
              <Link
                href="/dashboard/new"
                className="hidden sm:inline-flex rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-medium text-black transition hover:bg-[var(--color-accent-soft)]"
              >
                New goal
              </Link>
              <div className="ml-2 flex items-center gap-2">
                <span className="hidden md:inline text-xs text-[var(--color-text-dim)]">
                  {user.email ?? user.name}
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                  className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text)]"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : onPublicPage ? (
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              About gomotivateme
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-medium text-black transition hover:bg-[var(--color-accent-soft)]"
              >
                Get started
              </Link>
            </>
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
