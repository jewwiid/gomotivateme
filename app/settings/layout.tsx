import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, privacy, and notification preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
