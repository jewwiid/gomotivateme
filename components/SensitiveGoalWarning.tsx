"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

/**
 * Soft warning shown on the public page for categories that warrant care:
 * weight, mental health, eating, medical. Not a block — just a notice.
 */
export function SensitiveGoalWarning({ category }: { category: string }) {
  const sensitive = new Set(["weight"]);
  if (!sensitive.has(category)) return null;

  const messages: Record<string, string> = {
    weight:
      "This goal involves body or weight topics. gomotivateme is not a medical service. If you or someone you know is struggling, please reach out to a qualified professional.",
  };
  const body = messages[category] ?? null;
  if (!body) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-[var(--workspace-radius)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3.5 text-sm text-[var(--color-warning-text)]"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p className="text-xs text-current">{body}</p>
    </motion.div>
  );
}
