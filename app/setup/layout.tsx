import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finish setting up your profile",
  description: "Pick a handle and add a photo so your supporters know who they're backing.",
  robots: { index: false, follow: false },
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
