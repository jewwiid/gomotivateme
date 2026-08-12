"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  readCookieConsent,
} from "@/lib/analytics";

const DATAFAST_COOKIE_NAMES = [
  "datafast_visitor_id",
  "datafast_visitor_first_seen_at",
  "datafast_visitor_session_count",
  "datafast_session_id",
] as const;

const STORAGE = [
  {
    name: "Convex Auth session data",
    purpose: "Keeps you securely signed in",
    type: "Essential",
    duration: "Session / account session",
  },
  {
    name: "gomotivateme.visitorKey",
    purpose: "Prevents duplicate reactions (localStorage)",
    type: "Functional",
    duration: "Persistent",
  },
  {
    name: "datafast_*",
    purpose: "Counts visits, sessions, traffic sources, and selected product actions",
    type: "Analytics — optional",
    duration: "30 minutes to 1 year",
  },
] as const;

function writeConsent(analytics: boolean) {
  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify({ analytics, at: Date.now(), version: COOKIE_CONSENT_VERSION })
  );
}

function clearDataFastCookies() {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const name of DATAFAST_COOKIE_NAMES) {
    document.cookie = `${name}=; Max-Age=0; expires=${expires}; path=/`;
    document.cookie = `${name}=; Max-Age=0; expires=${expires}; path=/; domain=.gomotivateme.com`;
    document.cookie = `${name}=; Max-Age=0; expires=${expires}; path=/; domain=.gomotivate.me`;
    document.cookie = `${name}=; Max-Age=0; expires=${expires}; path=/; domain=.www.gomotivate.me`;
  }
  window.sessionStorage.removeItem("datafast_pageview_state");
}

function isLiveSite() {
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === "gomotivateme.com" ||
    hostname.endsWith(".gomotivateme.com") ||
    hostname === "gomotivate.me" ||
    hostname.endsWith(".gomotivate.me")
  );
}

function isSensitiveLocation() {
  const { pathname, search } = window.location;
  if (
    pathname.startsWith("/email/unsubscribe") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/reset/confirm") ||
    pathname.startsWith("/verify")
  ) {
    return true;
  }

  const query = new URLSearchParams(search);
  return (
    query.has("token") ||
    query.has("code") ||
    query.has("email") ||
    (query.get("redirect")?.startsWith("/invite/") ?? false)
  );
}

export function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [loadAnalytics, setLoadAnalytics] = useState(false);

  useEffect(() => {
    const stored = readCookieConsent();
    if (!stored) {
      setVisible(true);
      return;
    }
    setAnalyticsEnabled(stored.analytics);
    const canTrack = stored.analytics && isLiveSite() && !isSensitiveLocation();
    if (stored.analytics && !canTrack) window.localStorage.setItem("datafast_ignore", "true");
    setLoadAnalytics(canTrack);
  }, []);

  useEffect(() => {
    const stored = readCookieConsent();
    if (!stored?.analytics) return;

    if (isSensitiveLocation()) {
      window.localStorage.setItem("datafast_ignore", "true");
      return;
    }

    window.localStorage.removeItem("datafast_ignore");
    if (isLiveSite()) setLoadAnalytics(true);
  }, [pathname]);

  useEffect(() => {
    const openSettings = () => setVisible(true);
    window.addEventListener("gomotivateme:open-cookie-settings", openSettings);
    return () => window.removeEventListener("gomotivateme:open-cookie-settings", openSettings);
  }, []);

  const choose = (analytics: boolean) => {
    const withdrawing = analyticsEnabled && !analytics;
    const sensitiveLocation = isSensitiveLocation();
    try {
      writeConsent(analytics);
      if (analytics && !sensitiveLocation) {
        window.localStorage.removeItem("datafast_ignore");
      } else {
        window.localStorage.setItem("datafast_ignore", "true");
        if (!analytics) clearDataFastCookies();
      }
    } catch {
      // If storage is unavailable, honour the choice for this page only.
    }

    setAnalyticsEnabled(analytics);
    setLoadAnalytics(analytics && isLiveSite() && !sensitiveLocation);
    setVisible(false);

    // The loaded tracker patches browser navigation. Reloading fully removes
    // it after withdrawal so no later pageview can recreate its cookies.
    if (withdrawing) window.location.reload();
  };

  return (
    <>
      {loadAnalytics ? (
        <>
          <Script id="datafast-queue" strategy="afterInteractive">
            {`window.datafast = window.datafast || function () {
              window.datafast.q = window.datafast.q || [];
              window.datafast.q.push(arguments);
            };`}
          </Script>
          <Script
            id="datafast-tracker"
            src="https://datafa.st/js/script.js"
            data-website-id="dfid_Fz3wZOPjx1AHWVQdEo7FK"
            data-domain="gomotivateme.com"
            data-allowed-hostnames="gomotivate.me,www.gomotivate.me"
            data-disable-console="true"
            data-disable-payments="true"
            strategy="afterInteractive"
          />
        </>
      ) : null}

      <AnimatePresence>
        {visible ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
          >
            <section
              aria-label="Cookie choices"
              className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-lg sm:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary)]">
                  <ShieldCheck size={18} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[var(--color-text)]">Your privacy choices</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    Essential storage keeps GoMotivateMe working. With your permission,
                    DataFast analytics helps us understand visits, traffic sources, and
                    whether core features are useful. Our custom events do not include
                    names, email addresses, or the text of goals and messages.
                  </p>

                  <AnimatePresence>
                    {expanded ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <table className="mt-3 w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
                              <th className="py-1.5 pr-2 font-semibold">Storage</th>
                              <th className="py-1.5 pr-2 font-semibold">Purpose</th>
                              <th className="py-1.5 font-semibold">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {STORAGE.map((item) => (
                              <tr key={item.name} className="border-b border-[var(--color-border-subtle)] last:border-0">
                                <td className="break-all py-1.5 pr-2 font-mono text-[10px] text-[var(--color-text-muted)]">{item.name}</td>
                                <td className="py-1.5 pr-2 text-[var(--color-text-muted)]">{item.purpose}</td>
                                <td className="py-1.5 text-[var(--color-text-muted)]">{item.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setExpanded((value) => !value)}
                      className="inline-flex items-center gap-1 font-medium text-[var(--color-text-dim)] transition hover:text-[var(--color-primary)]"
                    >
                      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expanded ? "Hide details" : "See details"}
                    </button>
                    <Link href="/legal/cookies" className="font-semibold text-[var(--color-primary)] hover:underline">Cookie Policy</Link>
                    <Link href="/legal/privacy" className="font-semibold text-[var(--color-primary)] hover:underline">Privacy</Link>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => choose(false)}
                      className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 py-2.5 text-xs font-bold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
                    >
                      Reject optional
                    </button>
                    <button
                      type="button"
                      onClick={() => choose(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
                    >
                      <BarChart3 size={13} aria-hidden /> Accept analytics
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
