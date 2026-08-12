import type { Metadata } from "next";

/**
 * Noindex: this is the apply flow, not the goal itself. The public goal page
 * at /o/[handle]/[slug] is the canonical, indexable version.
 */
export const metadata: Metadata = {
  title: "Join a support team",
  description: "Choose how you'll support this goal and how often you'll check in.",
  robots: { index: false, follow: true },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
