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
  const isExplore = pathname?.startsWith("/explore");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isMotivate = pathname?.startsWith("/motivate");

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-[#e9e7df] bg-[#fffdf8]/95 backdrop-blur"
    >
      <div className="mx-auto flex h-[4.6rem] max-w-[90rem] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8 lg:gap-10">
          <Logo href="/" height={28} />
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#383834] md:flex">
            <Link
              href="/explore"
              className={`transition hover:text-[var(--color-primary)] ${
                isExplore ? "text-[var(--color-primary)]" : ""
              }`}
            >
              Explore
            </Link>
            <Link href="/#how-it-works" className="transition hover:text-[var(--color-primary)]">
              How it works
            </Link>
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className={`transition hover:text-[var(--color-primary)] ${
                    isDashboard ? "text-[var(--color-primary)]" : ""
                  }`}
                >
                  My goals
                </Link>
                <Link
                  href="/motivate"
                  className={`transition hover:text-[var(--color-primary)] ${
                    isMotivate ? "text-[var(--color-primary)]" : ""
                  }`}
                >
                  My circle
                </Link>
              </>
            )}
          </nav>
        </div>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          {user ? (
            <>
              {user.handle && (
                <Link
                  href={`/u/${user.handle}`}
                  className="hidden px-2 py-2 text-[#4c4d48] transition hover:text-[var(--color-primary)] sm:inline-flex"
                >
                  My profile
                </Link>
              )}
              <Link
                href="/settings"
                className="rounded-lg p-2 text-[#5e605a] transition hover:bg-[#f0efe8] hover:text-[var(--color-primary)]"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon size={16} />
              </Link>
              <Link
                href="/dashboard/new"
                className="hidden rounded-xl border border-[var(--color-primary)] px-4 py-2 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white sm:inline-flex"
              >
                Start a goal
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="hidden rounded-lg p-2 text-[#5e605a] transition hover:bg-[#f0efe8] hover:text-[var(--color-primary)] lg:inline-flex"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : onPublicPage ? (
            <Link
              href="/"
              className="px-3 py-2 text-[#4c4d48] transition hover:text-[var(--color-primary)]"
            >
              About gomotivateme
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-2 text-[#4c4d48] transition hover:text-[var(--color-primary)] sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-[var(--color-primary)] px-4 py-2 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
              >
                Start a goal
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
