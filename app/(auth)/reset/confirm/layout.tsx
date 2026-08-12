import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your account.",
  robots: { index: false, follow: false },
};

export default function ResetConfirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
