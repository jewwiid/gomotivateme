import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect AI Boss Leader",
  description:
    "Allow AI Boss Leader to create a goal from a campaign and post progress on GoMotivateMe.",
  robots: { index: false, follow: false },
};

export default function ConnectAiblLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
