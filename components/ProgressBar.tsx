"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
  /** 0..100 */
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

/**
 * Animated progress bar with a smooth spring.
 *
 * NOTE: the percent label is driven by a `useMotionValueEvent` subscription
 * to avoid the setState-in-render pitfall — see prior version that mirrored
 * the spring into React state and re-rendered on every animation frame.
 */
export function ProgressBar({
  value,
  className = "",
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const spring = useSpring(pct, { stiffness: 80, damping: 18, mass: 0.6 });
  const widthPct = useTransform(spring, (v) => `${v}%`);

  // Update the spring only when the target value actually changes.
  const lastTargetRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastTargetRef.current !== pct) {
      lastTargetRef.current = pct;
      spring.set(pct);
    }
  }, [pct, spring]);

  // Render the label as a non-React text node that we update imperatively.
  const labelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (labelRef.current) labelRef.current.textContent = `${v.toFixed(1)}%`;
    });
    return () => unsub();
  }, [spring]);

  // First-paint label so SSR / hydration have content immediately.
  const [initialLabel] = useState(() => `${pct.toFixed(1)}%`);

  return (
    <div className={className}>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-[var(--color-bg-elev)] ${SIZES[size]}`}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
          style={{ width: widthPct }}
        />
        {pct > 0 && (
          <motion.div
            className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/30"
            style={{ width: widthPct }}
            aria-hidden
          />
        )}
      </div>
      {showLabel && (
        <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>Progress</span>
          <span ref={labelRef} className="font-mono tabular-nums">
            {initialLabel}
          </span>
        </div>
      )}
    </div>
  );
}
