"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Share2,
  ThumbsUp,
  Trophy,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { Header } from "@/components/Header";

const FEATURES = [
  {
    icon: Trophy,
    title: "Set any goal",
    body: "Weight, fitness, learning, habits, creative, business — or roll your own.",
  },
  {
    icon: Share2,
    title: "Share one link",
    body: "Every goal gets a clean public URL. Send it to friends, family, or the internet.",
  },
  {
    icon: ImageIcon,
    title: "Post progress",
    body: "Drop notes, photos, links, and measured values as you go.",
  },
  {
    icon: ThumbsUp,
    title: "Crowdsource motivation",
    body: "Visitors cheer you on with thumbs-ups and notes — you choose what goes public.",
  },
  {
    icon: Users,
    title: "Real-time timeline",
    body: "Updates land live. Cheering lands live. No refresh required.",
  },
  {
    icon: Sparkles,
    title: "Earn badges",
    body: "Hit 25 / 50 / 75 / 100% on the way to your target. Tiny dopamine hits.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
          <div className="absolute top-20 right-1/4 h-72 w-72 rounded-full bg-[var(--color-gold)]/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/60 px-3 py-1 text-xs text-[var(--color-text-muted)]"
          >
            <Sparkles size={12} className="text-[var(--color-accent)]" />
            Beta · Crowdsourced motivation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
          >
            Set a goal.
            <br />
            <span className="gradient-text">Share the journey.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-balance text-lg text-[var(--color-text-muted)] sm:text-xl"
          >
            myodyssey turns your private goal into a public timeline. Drop progress, post photos,
            and let the people cheering you on send notes and thumbs-ups as you work toward your
            target date.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
            >
              Start your odyssey
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-card)] px-6 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-text-muted)]"
            >
              I have an account
            </Link>
          </motion.div>

          {/* Demo preview card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto mt-16 max-w-2xl"
          >
            <div className="rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-6 text-left shadow-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                <span className="font-mono">myodyssey.app/o/lose-20kg-by-summer-a1b2c</span>
              </div>
              <h3 className="text-xl font-semibold">Lose 20kg by summer</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                78kg → 58kg · 73 days left
              </p>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "42%" }}
                  transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>42% complete</span>
                <span>38 cheering</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <f.icon size={18} />
                </div>
                <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your next goal is one link away.
          </h2>
          <p className="mt-4 text-lg text-[var(--color-text-muted)]">
            Free while in beta. Set up takes 30 seconds.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
          >
            Create your account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-[var(--color-text-dim)]">
          myodyssey · beta · made for the people who want to be cheered on.
        </div>
      </footer>
    </div>
  );
}
