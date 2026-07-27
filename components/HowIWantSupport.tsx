"use client";

import { motion } from "framer-motion";
import { Check, Heart, Sparkles, Lightbulb, Calendar, Users } from "lucide-react";

const SUPPORT_META: Record<
  string,
  { label: string; description: string; icon: typeof Heart }
> = {
  encourage: {
    label: "Encouragement",
    description: "Cheer me on when motivation dips",
    icon: Heart,
  },
  experience: {
    label: "Shared experience",
    description: "Tell me what worked for you",
    icon: Sparkles,
  },
  advice: {
    label: "Practical advice",
    description: "Specific tips, resources, know-how",
    icon: Lightbulb,
  },
  checkin: {
    label: "Regular check-ins",
    description: "Keep me accountable on a schedule",
    icon: Calendar,
  },
  join: {
    label: "Join me",
    description: "Do this together: set your own version",
    icon: Users,
  },
};

const FRIENDLY: Record<string, string> = {
  encourage: "Encouragement",
  experience: "Shared experience",
  advice: "Practical advice",
  checkin: "Regular check-ins",
  join: "Joining in",
};

const FALLBACK_ORDER = ["encourage", "experience", "advice", "checkin", "join"];

/**
 * The checkmarked "How I want support" list — the doc's #1 element.
 * Tells visitors what kind of help the creator actually wants.
 */
export function HowIWantSupport({
  supportTypes,
  ownerName,
}: {
  supportTypes: string[];
  ownerName: string;
}) {
  const types = supportTypes.length > 0 ? supportTypes : FALLBACK_ORDER;
  const firstName = ownerName.split(" ")[0] || "them";

  return (
    <section className="workspace-card p-4 sm:p-6">
      <h2 className="text-base font-semibold text-[var(--color-text)]">
        How {firstName} wants support
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {types.map((t, i) => {
          const meta = SUPPORT_META[t] ?? SUPPORT_META.encourage;
          const Icon = meta.icon;
          return (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`min-w-0 rounded-xl bg-[var(--color-bg)] p-3 sm:flex sm:items-start sm:gap-3 ${
                types.length % 2 === 1 && i === types.length - 1
                  ? "col-span-2"
                  : ""
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white sm:mt-0.5">
                <Check size={12} strokeWidth={3} />
              </span>
              <div className="mt-2 min-w-0 sm:mt-0">
                <div className="text-sm font-semibold leading-5 text-[var(--color-text)]">{meta.label}</div>
                <div className="mt-0.5 hidden text-xs leading-5 text-[var(--color-text-muted)] sm:block">
                  {meta.description}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export const SUPPORT_LABEL = FRIENDLY;
