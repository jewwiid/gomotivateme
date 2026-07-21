"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { GoalCard } from "@/components/GoalCard";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useCurrentUser();
  const goals = useQuery(api.goals.listMine);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {user?.email ?? user?.name ?? "Welcome"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Your goals</h1>
          </div>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
          >
            <Plus size={14} />
            New goal
          </Link>
        </motion.div>

        {goals === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((g: any, i: number) => (
              <motion.div
                key={g._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <GoalCard goal={g} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        <Sparkles size={22} />
      </div>
      <h2 className="text-lg font-semibold">No goals yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--color-text-muted)]">
        Pick something you want to achieve. Set a number, a date, and a category. We'll give you
        a public link to share.
      </p>
      <Link
        href="/dashboard/new"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
      >
        <Plus size={14} />
        Create your first goal
      </Link>
    </div>
  );
}
