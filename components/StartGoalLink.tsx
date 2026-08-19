"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

export function StartGoalLink({ className }: { className?: string }) {
  const { user } = useCurrentUser();
  return (
    <Link href={user ? "/dashboard/new" : "/signup"} className={className}>
      Start a goal
    </Link>
  );
}
