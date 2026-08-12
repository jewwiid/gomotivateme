import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals you're showing up for",
  description: "The people you're motivating and what they need from you next.",
  robots: { index: false, follow: false },
};

export default function MotivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
