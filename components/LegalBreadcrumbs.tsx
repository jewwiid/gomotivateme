"use client";

import { usePathname } from "next/navigation";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";

const TITLES: Record<string, string> = {
  "/legal/privacy": "Privacy",
  "/legal/cookies": "Cookies",
  "/legal/terms": "Terms",
  "/legal/community-guidelines": "Community guidelines",
};

export function LegalBreadcrumbs() {
  const pathname = usePathname();
  const current = TITLES[pathname] ?? "Legal";

  return (
    <div className="mb-8">
      <PageBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Legal", href: "/legal/privacy" },
          { label: current, href: pathname },
        ]}
      />
    </div>
  );
}
