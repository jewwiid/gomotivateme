"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, BellOff } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/lib/format";

/**
 * Notification bell with unread badge + popover feed.
 * Renders in the Header when authenticated.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unread = useQuery(api.notifications.unreadCount, {});
  const notifications = useQuery(api.notifications.listMine, open ? {} : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const count = unread ?? 0;

  const onClickItem = async (notificationId: string, href: string) => {
    await markRead({ notificationId: notificationId as Id<"notifications"> });
    setOpen(false);
    router.push(href);
  };

  const onMarkAll = async () => {
    await markAllRead({});
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl sm:w-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <span className="text-sm font-bold text-[var(--color-text)]">
                Notifications
              </span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={onMarkAll}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Feed */}
            <div className="max-h-96 overflow-y-auto">
              {notifications === undefined ? (
                <div className="p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="mb-3 h-14 animate-pulse rounded-lg bg-[var(--color-bg-elev)]" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-12 text-center">
                  <BellOff size={24} className="mb-2 text-[var(--color-text-dim)]" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No notifications yet.
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-dim)]">
                    You'll see cheers, new supporters, and goal updates here.
                  </p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => onClickItem(n._id, n.href)}
                    className={`flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition hover:bg-[var(--color-bg-elev)] ${
                      !n.readAt ? "bg-[var(--color-primary)]/[0.03]" : ""
                    }`}
                  >
                    {/* Unread dot */}
                    <span className="mt-1.5 shrink-0">
                      {!n.readAt ? (
                        <span className="block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.readAt ? "font-semibold text-[var(--color-text)]" : "font-medium text-[var(--color-text-muted)]"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-dim)]">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
