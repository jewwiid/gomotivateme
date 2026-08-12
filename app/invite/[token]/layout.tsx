import type { Metadata } from "next";

/**
 * Invite links are single-use and token-bearing — never index them.
 */
export const metadata: Metadata = {
  title: "You're invited to support a goal",
  description: "Someone asked you to join their support team on GoMotivateMe.",
  robots: { index: false, follow: false, nocache: true },
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
