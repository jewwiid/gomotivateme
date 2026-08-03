"use client";

import {
  Heart,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/WorkspaceShell";

export type DashboardWorkspaceSection =
  | "goals"
  | "supporting"
  | "circle"
  | "settings";

export function DashboardWorkspaceShell({
  active,
  children,
}: {
  active: DashboardWorkspaceSection;
  children: ReactNode;
}) {
  const items: WorkspaceNavItem[] = [
    {
      label: "My goals",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: active === "goals",
    },
    {
      label: "Supporting",
      href: "/dashboard/supporting",
      icon: Heart,
      active: active === "supporting",
    },
    {
      label: "My circle",
      href: "/motivate",
      icon: Users,
      active: active === "circle",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: active === "settings",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <WorkspaceShell items={items} ariaLabel="Account workspace">
        {children}
      </WorkspaceShell>
    </div>
  );
}
