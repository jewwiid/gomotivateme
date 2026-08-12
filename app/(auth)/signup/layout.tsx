import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Start a goal, build a support team, and keep going with people who want to see you finish. Free to join.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Create your account · GoMotivateMe",
    description:
      "Start a goal, build a support team, and keep going with people who want to see you finish.",
    url: "/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
