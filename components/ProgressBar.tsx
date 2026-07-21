"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

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
 * Animated progress bar with a smooth spring. Used on the public page and
 * in the dashboard cards.
 */
export function ProgressBar({
  value,
  className = "",
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const spring = useSpring(0, { stiffness: 80, damping: 18, mass: 0.6 });
  const widthPct = useTransform(spring, (v) => `${v}%`);

  // Mirror the spring value into React state for the percent label.
  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplayPct(v));
    return () => unsub();
  }, [spring]);

  useEffect(() => {
    spring.set(pct);
  }, [pct, spring]);

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
          <span className="font-mono tabular-nums">{displayPct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
