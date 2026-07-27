"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Heart,
  Lightbulb,
  Calendar,
  Target,
  Users,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Heart; color: string }
> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-[var(--color-danger)]" },
  accountability: {
    label: "Accountability",
    icon: Calendar,
    color: "text-[var(--color-success-text)]",
  },
  advice: { label: "Advice", icon: Lightbulb, color: "text-[var(--color-gold)]" },
  review: { label: "Review", icon: Target, color: "text-[var(--color-primary)]" },
  challenge: { label: "Challenge", icon: Users, color: "text-[var(--color-primary)]" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After every update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

export function MotivationCircleWidget({
  goalId,
  coreMotivatorMin = 3,
  isOwner = false,
  isLoggedIn = false,
}: {
  goalId: Id<"goals">;
  coreMotivatorMin?: number;
  isOwner?: boolean;
  isLoggedIn?: boolean;
}) {
  const motivators = useQuery(api.motivation.listActiveMotivators, { goalId });
  const core = (motivators ?? []).filter((m) => m.isCoreMotivator);
  const publicCount = (motivators ?? []).length - core.length;

  if (motivators === undefined) {
    return (
      <div className="workspace-card p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-bg-sunken)]" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-[var(--color-bg-elev)]" />
          ))}
        </div>
      </div>
    );
  }

  const coreCount = core.length;

  return (
    <div className="workspace-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Motivation Circle
          </div>
          <div className="mt-1 font-display text-base font-semibold text-[var(--color-text)]">
            {coreCount} of 6 core motivators
            {publicCount > 0 && (
              <span className="ml-1.5 text-sm font-normal text-[var(--color-text-muted)]">
                · {publicCount} more
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-[10px] font-medium text-[var(--color-text-muted)]">
          {coreCount < coreMotivatorMin ? (
            <>Launch needs {coreMotivatorMin - coreCount} more</>
          ) : (
            <>Ready to launch</>
          )}
        </div>
      </div>

      {/* Avatar grid — 6 slots, filled slots show real data, empty slots show "open" */}
      <div className="mt-4 grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const m = core[i];
          if (!m) {
            return (
              <div
                key={i}
                className="aspect-square rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)]"
                title="Open circle place"
              />
            );
          }
          return (
            <Avatar key={m._id} name={m.user?.displayName ?? "Motivator"} image={m.user?.image ?? null} />
          );
        })}
      </div>

      {/* Pledges list */}
      {core.length > 0 && (
        <div className="mt-5 space-y-2">
          {core.map((m) => {
            const meta = ROLE_META[m.role] ?? ROLE_META.encourager;
            const Icon = meta.icon;
            return (
              <div
                key={m._id}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-elev)] px-3 py-2"
              >
                <div className={`shrink-0 ${meta.color}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div className="truncate text-xs font-semibold text-[var(--color-text)]">
                      {m.user?.displayName ?? "Motivator"}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">
                      {meta.label} · {FREQ_LABEL[m.checkInFrequency] ?? m.checkInFrequency}
                    </div>
                  </div>
                  {m.pledgeText && (
                    <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-secondary)]">
                      "{m.pledgeText}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Public motivators (not core) */}
      {publicCount > 0 && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Additional motivators
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(motivators ?? [])
              .filter((m) => !m.isCoreMotivator)
              .map((m) => {
                const meta = ROLE_META[m.role] ?? ROLE_META.encourager;
                return (
                  <span
                    key={m._id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)]"
                  >
                    <span className={`${meta.color}`}>
                      <meta.icon size={10} />
                    </span>
                    {m.user?.displayName ?? "Motivator"}
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty state — no motivators yet */}
      {coreCount === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-primary-dark)]">
          <Sparkles size={12} className="shrink-0 text-[var(--color-primary)]" />
          The goal owner is still assembling their circle.
        </div>
      )}

      {/* CTAs */}
      {!isOwner && isLoggedIn && coreCount < 6 && (
        <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
          <Link
            href={`/o/apply/${goalId}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-text)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-text)]"
          >
            <Sparkles size={14} />
            Apply to motivate
          </Link>
        </div>
      )}
      {!isOwner && !isLoggedIn && coreCount < 6 && (
        <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
          <Link
            href={`/signup?redirect=${encodeURIComponent(`/o/apply/${goalId}`)}`}
            className="inline-flex w-full items-center justify-center gap-2 workspace-card px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-border-strong)]"
          >
            Join the support team
          </Link>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="aspect-square overflow-hidden rounded-full border-2 border-white bg-[var(--color-bg-elev)] shadow-sm"
        title={name}
      >
        <img src={image} alt={name} className="h-full w-full object-cover" />
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex aspect-square items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-semibold text-white shadow-sm"
      title={name}
    >
      {initials || "M"}
    </motion.div>
  );
}
