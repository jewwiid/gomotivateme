"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDown, Search, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Logo } from "@/components/Logo";

export function Header() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const isExplore = pathname?.startsWith("/explore");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isMotivate = pathname?.startsWith("/motivate");
  const accountLabel = user?.name?.split(" ")[0] || user?.handle || "Account";
  const startGoalHref = user ? "/dashboard/new" : "/signup";

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-[#e9e7df] bg-[#fffdf8]/95 backdrop-blur"
    >
      <div className="relative mx-auto flex h-[4.25rem] max-w-[50rem] items-center px-5 sm:px-6">
        <nav aria-label="Primary navigation" className="hidden items-center gap-5 text-sm font-medium text-[#31312e] md:flex">
          <Link
            href="/explore"
            className={`inline-flex items-center gap-1.5 transition hover:text-[var(--color-primary)] ${
              isExplore ? "text-[var(--color-primary)]" : ""
            }`}
          >
            <Search size={14} strokeWidth={1.9} aria-hidden />
            Explore
          </Link>
          <Link href="/#how-it-works" className="transition hover:text-[var(--color-primary)]">
            How it works
          </Link>
          <Link href={startGoalHref} className="hidden transition hover:text-[var(--color-primary)] lg:inline-flex">
            Start a goal
          </Link>
        </nav>

        <Logo
          href="/"
          height={50}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        <nav aria-label="Account navigation" className="ml-auto flex items-center gap-4 text-sm font-medium text-[#31312e]">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`hidden transition hover:text-[var(--color-primary)] sm:inline-flex ${
                  isDashboard ? "text-[var(--color-primary)]" : ""
                }`}
              >
                My goals
              </Link>
              <Link
                href="/motivate"
                className={`hidden transition hover:text-[var(--color-primary)] xl:inline-flex ${
                  isMotivate ? "text-[var(--color-primary)]" : ""
                }`}
              >
                My circle
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 transition hover:text-[var(--color-primary)]"
                aria-label="Account settings"
              >
                <AvatarBubble image={user.image} name={user.name ?? user.handle ?? "?"} />
                <span className="hidden sm:inline">{accountLabel}</span>
                <ChevronDown size={13} strokeWidth={1.8} aria-hidden />
              </Link>
            </>
          ) : (
            <Link href="/login" className="transition hover:text-[var(--color-primary)]">
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
 * Tiny avatar slot used in the header. Shows the user's image when
 * available, with an onError fallback to the initials chip so a
 * broken/expired Convex storage URL doesn't render a browser broken-
 * image icon. `key` is included so a fresh URL (after re-upload) gets
 * a fresh img element instead of a cached error.
 */
function AvatarBubble({ image, name }: { image: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const showImage = image && !errored;

  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  if (!showImage) {
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f0efe9] text-[10px] font-bold text-[#4d4e48]">
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
      className="h-6 w-6 rounded-full object-cover"
    />
  );
}
