import type { Metadata } from "next";

/**
 * Metadata-only layout. Everything under /dashboard is behind auth and
 * renders nothing useful to a crawler, so the whole subtree is noindex.
 */
export const metadata: Metadata = {
  title: "Your goals",
  description: "Track progress, post updates, and see who's backing your goals.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
