import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a goal",
  description: "Set your goal, choose what progress means, and invite your support team.",
  robots: { index: false, follow: false },
};

export default function NewGoalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
