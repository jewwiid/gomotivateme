import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals you support",
  description: "The goals you've backed and the check-ins you owe them.",
  robots: { index: false, follow: false },
};

export default function SupportingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
