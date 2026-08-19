"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/useCurrentUser";

const MARKETING_PREFIXES = ["/", "/about", "/faq", "/explore", "/stories"];

function isMarketingPath(pathname: string) {
  return MARKETING_PREFIXES.some((path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Mobile conversion bar for public marketing pages. The header "Start a goal"
 * control is hidden below `sm`, so this keeps the primary action on screen.
 */
export function StickyMarketingCta() {
  const pathname = usePathname() ?? "/";
  const { user, isLoading } = useCurrentUser();

  if (isLoading || !isMarketingPath(pathname)) return null;

  const href = user ? "/dashboard/new" : "/signup";

  return (
    <>
      <div className="h-[4.75rem] md:hidden" aria-hidden />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/92 px-4 py-3 backdrop-blur md:hidden"
      >
        <Link
          href={href}
          data-fast-goal="start_goal_clicked"
          data-fast-goal-source="sticky_mobile"
          className="mx-auto flex min-h-12 max-w-lg items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Start your goal
          <span className="ml-3" aria-hidden>
            →
          </span>
        </Link>
      </motion.div>
    </>
  );
}
