import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a password reset link.",
  robots: { index: false, follow: false },
};

export default function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
