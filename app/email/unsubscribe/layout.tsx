import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email preferences",
  description: "Choose which emails GoMotivateMe sends you, or turn them off entirely.",
  robots: { index: false, follow: false, nocache: true },
};

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
