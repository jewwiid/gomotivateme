import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Your GoMotivateMe account is ready. Create a goal and invite the people who should see it.",
  robots: { index: false, follow: false },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
