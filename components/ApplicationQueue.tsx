"use client";

import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Heart,
  Lightbulb,
  Calendar,
  Target,
  Users,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Heart; color: string }
> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-rose-500" },
  accountability: {
    label: "Accountability",
    icon: Calendar,
    color: "text-emerald-600",
  },
  advice: { label: "Advice", icon: Lightbulb, color: "text-amber-500" },
  review: { label: "Review", icon: Target, color: "text-sky-600" },
  challenge: { label: "Challenge", icon: Users, color: "text-violet-500" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ApplicationQueue({ goalId }: { goalId: Id<"goals"> }) {
  const apps = useQuery(api.motivation.listPendingApplications, { goalId });
  const approve = useMutation(api.motivation.approveApplication);
  const decline = useMutation(api.motivation.declineApplication);
  const [busyId, setBusyId] = useState<Id<"motivatorApplications"> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = apps ?? [];
  const count = list.length;

  if (count === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-text-dim)]" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Public motivator applications
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          None pending. When someone applies to motivate this goal, it'll show
          up here.
        </p>
      </div>
    );
  }

  const onApprove = async (appId: Id<"motivatorApplications">) => {
    setBusyId(appId);
    setErr(null);
    try {
      await approve({ applicationId: appId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't approve");
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (appId: Id<"motivatorApplications">) => {
    setBusyId(appId);
    setErr(null);
    try {
      await decline({ applicationId: appId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't decline");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Public motivator applications
          </div>
        </div>
        <span className="inline-flex items-center justify-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          {count} pending
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <AnimatePresence>
          {list.map((app) => {
            const meta = ROLE_META[app.requestedRole] ?? ROLE_META.encourager;
            const Icon = meta.icon;
            const initials = (app.applicant?.name ?? app.applicant?.email ?? "?")
              .split(/\s+/)
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <motion.div
                key={app._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3"
              >
                <div className="flex items-start gap-3">
                  {app.applicant?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.applicant.image}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-semibold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-xs font-semibold">
                        {app.applicant?.name ?? app.applicant?.email ?? "Someone"}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] ${meta.color}`}>
                        <Icon size={9} />
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-dim)]">
                        · {timeAgo(app.createdAt)}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      "{app.message}"
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onApprove(app._id)}
                        disabled={busyId === app._id}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                      >
                        <Check size={10} />
                        Accept
                      </button>
                      <button
                        onClick={() => onDecline(app._id)}
                        disabled={busyId === app._id}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                      >
                        <X size={10} />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {err && <p className="mt-2 text-[10px] text-red-400">{err}</p>}
    </div>
  );
}
