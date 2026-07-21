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
    description: "Do this together — set your own version",
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
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">
        How {firstName} wants support
      </h2>
      <ul className="mt-4 space-y-2.5">
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
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Check size={12} strokeWidth={3} />
              </span>
              <div>
                <div className="text-sm font-semibold text-zinc-900">{meta.label}</div>
                <div className="text-xs text-zinc-500">{meta.description}</div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export const SUPPORT_LABEL = FRIENDLY;
