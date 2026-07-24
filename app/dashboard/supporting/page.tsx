"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Heart, ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";

const SUPPORT_LABELS: Record<string, string> = {
  encourage: "Encouraging",
  experience: "Sharing experience",
  advice: "Offering advice",
  checkin: "Checking in",
  join: "Joined the challenge",
};

export default function SupportingPage() {
  return (
    <RequireAuth>
      <SupportingContent />
    </RequireAuth>
  );
}

function SupportingContent() {
  const supports = useQuery(api.supporters.listMySupports, {});

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="mx-auto max-w-[60rem] px-5 py-14 sm:px-8 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="brand-kicker">Your support team memberships</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Goals you're supporting
          </h1>
          <Link
            href="/explore"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:gap-3"
          >
            Find more goals to support <ArrowRight size={16} />
          </Link>
        </motion.div>

        {supports === undefined ? (
          <div className="mt-10 divide-y divide-[#deddd6] border-y border-[#deddd6]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-[#f3f2ed]" />
            ))}
          </div>
        ) : supports.length === 0 ? (
          <div className="mt-10 grid place-items-center border-y border-dashed border-[#c9c8c0] px-6 py-16 text-center">
            <Heart size={28} className="text-[#c68d00]" />
            <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.035em]">
              No support yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#686963]">
              When you support a goal, it'll appear here so you can keep track.
            </p>
            <Link
              href="/explore"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              Browse goals <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="mt-10 divide-y divide-[#deddd6] border-y border-[#deddd6]">
            {supports.map((s: any, i: number) => (
              <motion.div
                key={s._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="py-5"
              >
                <Link
                  href={`/o/${s.goalSlug}`}
                  className="group block"
                >
                  <h2 className="truncate font-display text-xl font-bold tracking-[-0.03em] transition group-hover:text-[var(--color-primary)]">
                    {s.goalTitle}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#686963]">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Sparkles size={13} className="text-[var(--color-primary)]" />
                      {SUPPORT_LABELS[s.supportType] ?? s.supportType}
                    </span>
                    <span className="h-4 w-px bg-[#deddd6]" />
                    <span>by {s.ownerName ?? "Someone"}</span>
                    {s.goalStatus === "completed" && (
                      <>
                        <span className="h-4 w-px bg-[#deddd6]" />
                        <span className="font-medium text-[var(--color-success)]">Completed</span>
                      </>
                    )}
                    {s.goalStatus === "paused" && (
                      <>
                        <span className="h-4 w-px bg-[#deddd6]" />
                        <span className="text-[#888983]">Paused</span>
                      </>
                    )}
                  </div>
                  {s.pledge && (
                    <p className="mt-2 line-clamp-1 text-sm italic text-[#777872]">
                      "{s.pledge}"
                    </p>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}