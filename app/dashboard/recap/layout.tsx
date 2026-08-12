import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your recap",
  description: "A look back at the progress you've made and who showed up for you.",
  robots: { index: false, follow: false },
};

export default function RecapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
