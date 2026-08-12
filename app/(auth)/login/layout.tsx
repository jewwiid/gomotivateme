import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to GoMotivateMe to track your goals and check in on the people you're backing.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
