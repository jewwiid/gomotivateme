"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, MessageCircle } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  encouragement: "Encouragement",
  accountability: "Accountability",
  advice: "Advice",
  reflection: "Reflection",
  milestone: "Milestone",
};

const TYPE_COLORS: Record<string, string> = {
  encouragement: "bg-emerald-50 text-emerald-700",
  accountability: "bg-amber-50 text-amber-700",
  advice: "bg-blue-50 text-blue-700",
  reflection: "bg-purple-50 text-purple-700",
  milestone: "bg-pink-50 text-pink-700",
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

/**
 * Owner-facing list of recent check-ins on a goal. Shown on the goal page
 * (owner-only). Each check-in shows motivator, type badge, message, and
 * timestamp. Owner can acknowledge (mark read).
 */
export function CheckInList({ goalId }: { goalId: Id<"goals"> }) {
  const checkIns = useQuery(api.motivation.listCheckInsForGoal, { goalId });
  const acknowledge = useMutation(api.motivation.acknowledgeCheckIn);

  if (checkIns === undefined) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-[#f0efe9]" />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <MessageCircle size={16} />
          No check-ins yet. Your motivators will show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-[var(--color-text)]">
        Check-ins from your circle
      </h3>
      <div className="space-y-4">
        {checkIns.map((c) => (
          <div
            key={c._id}
            className={`flex gap-3 ${c.acknowledgedAt ? "opacity-60" : ""}`}
          >
            {/* Avatar */}
            {c.motivator.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.motivator.image}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0efe9] text-xs font-semibold text-[#4d4e48]">
                {(c.motivator.name ?? "?")[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {c.motivator.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    TYPE_COLORS[c.type] ?? "bg-gray-50 text-gray-700"
                  }`}
                >
                  {TYPE_LABELS[c.type] ?? c.type}
                </span>
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {c.body}
              </p>
              {!c.acknowledgedAt && (
                <button
                  onClick={() => acknowledge({ checkInId: c._id })}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-dim)] transition hover:text-[var(--color-primary)]"
                >
                  <Check size={10} />
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
