"use client";

import { useEffect, useState } from "react";

const KEY = "myodyssey.visitorKey";

/**
 * Stable per-browser visitor identifier, used to dedupe thumbs-up.
 * Generated lazily on first use and stored in localStorage.
 */
export function useVisitorKey(): string | null {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    try {
      let existing = window.localStorage.getItem(KEY);
      if (!existing) {
        // 16 random hex chars — enough entropy for the dedup use case.
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        existing = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        window.localStorage.setItem(KEY, existing);
      }
      setKey(existing);
    } catch {
      // localStorage unavailable (private mode, SSR); fall back to no key.
      setKey(null);
    }
  }, []);
  return key;
}
