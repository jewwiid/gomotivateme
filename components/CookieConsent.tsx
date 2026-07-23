"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";

/**
 * GDPR-compliant cookie consent banner.
 *
 * The site uses ONLY essential cookies (Convex Auth session tokens) — no
 * analytics, no marketing, no tracking. This banner is transparent about
 * that: it informs users what's set and why, with a single dismiss button
 * since there's nothing to opt out of.
 *
 * Consent state lives in localStorage (not a cookie). If the CONSENT_VERSION
 * bumps (e.g. when analytics are added later), the banner re-shows so users
 * can re-consent to the new reality.
 */

const STORAGE_KEY = "gomotivateme.cookieConsent";
const CONSENT_VERSION = 1;

const COOKIES = [
  {
    name: "__Host-__convexAuthJWT",
    purpose: "Keeps you signed in after login",
    type: "Essential",
    duration: "Session",
  },
  {
    name: "__Host-__convexAuthRefreshToken",
    purpose: "Refreshes your session so you stay logged in",
    type: "Essential",
    duration: "Session",
  },
  {
    name: "__Host-__convexAuthOAuthVerifier",
    purpose: "Security check during Google sign-in",
    type: "Essential",
    duration: "Transient (minutes)",
  },
  {
    name: "gomotivateme.visitorKey",
    purpose: "Prevents duplicate reactions (localStorage, not a cookie)",
    type: "Functional",
    duration: "Persistent",
  },
];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION && parsed.accepted) return;
      }
    } catch {
      // corrupt or missing — show the banner
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accepted: true, at: Date.now(), version: CONSENT_VERSION })
      );
    } catch {
      // localStorage unavailable — dismiss in-memory only
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-[#deddd6] bg-[#fffdf8] p-5 shadow-lg sm:p-6">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-[#292929]">
                  We use <strong>essential cookies</strong> to keep you signed in and
                  the site working. No tracking, no analytics, no ads.{" "}
                  <Link
                    href="/legal/cookies"
                    className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                  >
                    Cookie Policy
                  </Link>{" "}
                  ·{" "}
                  <Link
                    href="/legal/privacy"
                    className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                  >
                    Privacy
                  </Link>
                </p>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <table className="mt-3 w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#deddd6] text-[#888983]">
                            <th className="py-1.5 pr-2 font-semibold">Cookie</th>
                            <th className="py-1.5 pr-2 font-semibold">Purpose</th>
                            <th className="py-1.5 font-semibold">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {COOKIES.map((c) => (
                            <tr key={c.name} className="border-b border-[#f0efe9] last:border-0">
                              <td className="break-all py-1.5 pr-2 font-mono text-[10px] text-[#686963]">
                                {c.name}
                              </td>
                              <td className="py-1.5 pr-2 text-[#686963]">{c.purpose}</td>
                              <td className="py-1.5 text-[#686963]">{c.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-dim)] transition hover:text-[var(--color-primary)]"
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={12} /> Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} /> See details
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={dismiss}
                className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
