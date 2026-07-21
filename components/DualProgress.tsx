"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DualProgressProps {
  /** 0..100 */
  goalPct: number;
  /** Current supporters */
  supporterCount: number;
  /** Supporter target, or null if no target set */
  supporterTarget: number | null;
  /** Goal label, e.g. "6 of 12 chapters" */
  goalLabel: string;
  unit: string;
}

/**
 * The two-bar crowdfunding view: goal progress + supporter progress.
 * This is the central visual differentiator vs. plain goal apps.
 */
export function DualProgress({
  goalPct,
  supporterCount,
  supporterTarget,
  goalLabel,
  unit,
}: DualProgressProps) {
  const goalSpring = useSpring(0, { stiffness: 80, damping: 18, mass: 0.6 });
  const goalWidth = useTransform(goalSpring, (v) => `${v}%`);

  const supporterPct =
    supporterTarget && supporterTarget > 0
      ? Math.min(100, (supporterCount / supporterTarget) * 100)
      : null;
  const supSpring = useSpring(0, { stiffness: 80, damping: 18, mass: 0.6 });
  const supWidth = useTransform(supSpring, (v) => `${v}%`);

  // Animate springs only when target actually changes
  const lastGoalRef = useRef<number | null>(null);
  const lastSupRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastGoalRef.current !== goalPct) {
      lastGoalRef.current = goalPct;
      goalSpring.set(goalPct);
    }
  }, [goalPct, goalSpring]);
  useEffect(() => {
    if (supporterPct === null) return;
    if (lastSupRef.current !== supporterPct) {
      lastSupRef.current = supporterPct;
      supSpring.set(supporterPct);
    }
  }, [supporterPct, supSpring]);

  // Imperatively updated labels
  const goalLabelRef = useRef<HTMLSpanElement>(null);
  const supLabelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const u1 = goalSpring.on("change", (v) => {
      if (goalLabelRef.current) goalLabelRef.current.textContent = `${Math.round(v)}%`;
    });
    const u2 = supSpring.on("change", (v) => {
      if (supLabelRef.current) supLabelRef.current.textContent = `${Math.round(v)}%`;
    });
    return () => {
      u1();
      u2();
    };
  }, [goalSpring, supSpring]);

  return (
    <div className="space-y-5">
      <ProgressBar
        label="Goal progress"
        valueLabel={goalLabel}
        subLabel={`${Math.round(goalPct)}% complete · ${unit}`}
        pctRef={goalLabelRef}
        initialPct={goalPct}
        width={goalWidth}
        color="from-[var(--color-accent)] to-[var(--color-gold)]"
        icon={<TrendingUp size={11} />}
      />
      <ProgressBar
        label="Support raised"
        valueLabel={
          supporterTarget
            ? `${supporterCount} of ${supporterTarget} supporters`
            : `${supporterCount} ${supporterCount === 1 ? "supporter" : "supporters"}`
        }
        subLabel={
          supporterPct === null
            ? "No target set"
            : supporterPct >= 100
            ? "🎉 Target reached"
            : `${supporterTarget! - supporterCount} to go`
        }
        pctRef={supLabelRef}
        initialPct={supporterPct ?? 0}
        width={supWidth}
        color="from-emerald-500 to-emerald-300"
        icon={<Users size={11} />}
      />
    </div>
  );
}

function ProgressBar({
  label,
  valueLabel,
  subLabel,
  pctRef,
  initialPct,
  width,
  color,
  icon,
}: {
  label: string;
  valueLabel: string;
  subLabel: string;
  pctRef: React.RefObject<HTMLSpanElement | null>;
  initialPct: number;
  width: any;
  color: string;
  icon: React.ReactNode;
}) {
  // First-paint label so SSR / hydration have content immediately.
  const [initial] = useState(() => `${Math.round(initialPct)}%`);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {icon}
          {label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--color-text)]">
          {valueLabel}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${color}`}
          style={{ width }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-dim)]">
        <span>{subLabel}</span>
        <span ref={pctRef} className="font-mono tabular-nums">
          {initial}
        </span>
      </div>
    </div>
  );
}
