"use client";

import Link from "next/link";
import {
  Heart,
  LayoutDashboard,
  Plus,
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
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />
      <WorkspaceShell
        items={items}
        ariaLabel="Account workspace"
        asideFooter={
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <p className="text-sm font-bold text-[#282925]">Ready for what’s next?</p>
            <p className="mt-2 text-xs leading-5 text-[#6c706f]">
              Turn a personal ambition into a goal your people can support.
            </p>
            <Link
              href="/dashboard/new"
              className="workspace-button-primary mt-4"
            >
              <Plus size={15} aria-hidden />
              Start a goal
            </Link>
          </div>
        }
      >
        {children}
      </WorkspaceShell>
    </div>
  );
}
