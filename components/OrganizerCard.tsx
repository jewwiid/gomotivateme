"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function OrganizerCard({
  ownerId,
  ownerName,
  ownerImage,
  goalCount,
}: {
  ownerId: Id<"users">;
  ownerName?: string;
  ownerImage?: string;
  goalCount: number;
}) {
  // Always do a live lookup so profile changes reflect on existing goals.
  const live = useQuery(
    api.users.profilesById,
    { ids: [ownerId] }
  );
  const name = live?.[ownerId]?.name || ownerName || "Organizer";
  const image = live?.[ownerId]?.image || ownerImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="workspace-card p-4"
    >
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="h-10 w-10 rounded-full border border-[var(--color-border)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-base font-semibold text-white">
            {(name[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            Organized by {name}
          </div>
          <div className="text-xs text-[var(--color-text-dim)]">
            {goalCount} {goalCount === 1 ? "goal" : "goals"} on gomotivateme
          </div>
        </div>
      </div>
    </motion.div>
  );
}
