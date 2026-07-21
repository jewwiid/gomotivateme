"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Image as ImageIcon, Link as LinkIcon, MessageSquare, TrendingUp } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

interface UpdateDoc {
  _id: Id<"updates">;
  type: "value" | "milestone" | "note" | "image" | "link";
  value?: number;
  note?: string;
  imageId?: Id<"_storage">;
  linkUrl?: string;
  linkTitle?: string;
  createdAt: number;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatDay(ts: number) {
  const d = new Date(ts);
  return {
    month: MONTHS[d.getMonth()],
    day: d.getDate().toString().padStart(2, "0"),
    year: d.getFullYear().toString(),
    full: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

/**
 * Editorial dated timeline — the doc's signature element.
 * Each entry gets a big month/day marker on the left, content on the right.
 */
export function EditorialTimeline({
  goalId,
  unit = "units",
  imageUrlOf,
}: {
  goalId: Id<"goals">;
  unit?: string;
  imageUrlOf?: (imageId: Id<"_storage">) => string | null;
}) {
  const updates = useQuery(api.updates.listForGoal, { goalId });

  if (updates === undefined) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">The journey</h2>
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      </section>
    );
  }

  if (updates.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
        <h2 className="text-base font-semibold text-zinc-900">The journey hasn't started yet</h2>
        <p className="mt-1 text-sm text-zinc-500">Check back soon.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h2 className="text-base font-semibold text-zinc-900">The journey</h2>

      <ol className="mt-6 space-y-6">
        {updates.map((u: any, i: number) => {
          const d = formatDay(u.createdAt);
          return (
            <motion.li
              key={u._id}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
              className="grid grid-cols-[64px_1fr] gap-4 sm:grid-cols-[80px_1fr]"
            >
              {/* Date marker */}
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  {d.month}
                </div>
                <div className="text-3xl font-bold leading-none text-zinc-900">
                  {parseInt(d.day, 10)}
                </div>
                <div className="mt-1 text-[10px] text-zinc-400">{d.year}</div>
              </div>

              {/* Content */}
              <div className="border-l border-zinc-200 pl-4 sm:pl-6">
                <EntryHeader u={u} />
                <EntryBody u={u} unit={unit} imageUrlOf={imageUrlOf} />
                {u.note && (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                    {u.note}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

function EntryHeader({ u }: { u: UpdateDoc }) {
  if (u.type === "value") {
    return (
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <TrendingUp size={11} />
        Value logged {u.value !== undefined && <span className="text-[var(--color-primary)]">· {u.value}</span>}
      </div>
    );
  }
  if (u.type === "milestone") {
    return (
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-success)]">
        <CheckCircle2 size={11} />
        Milestone done
      </div>
    );
  }
  if (u.type === "image") {
    return (
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <ImageIcon size={11} />
        Photo
      </div>
    );
  }
  if (u.type === "link") {
    return (
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <LinkIcon size={11} />
        Link shared
      </div>
    );
  }
  return (
    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      <MessageSquare size={11} />
      Note
    </div>
  );
}

function EntryBody({
  u,
  unit,
  imageUrlOf,
}: {
  u: UpdateDoc;
  unit: string;
  imageUrlOf?: (imageId: Id<"_storage">) => string | null;
}) {
  if (u.type === "image" && u.imageId && imageUrlOf) {
    const url = imageUrlOf(u.imageId);
    if (url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt="" className="mb-2 max-h-72 w-full rounded-xl object-cover" />;
    }
  }
  if (u.type === "link" && u.linkUrl) {
    return (
      <a
        href={u.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300"
      >
        <div className="font-medium text-[var(--color-primary)]">
          {u.linkTitle || u.linkUrl}
        </div>
        {u.linkTitle && <div className="truncate text-xs text-zinc-500">{u.linkUrl}</div>}
      </a>
    );
  }
  return null;
}
