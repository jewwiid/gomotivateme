"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("gomotivateme:open-cookie-settings"))}
      className="transition hover:text-[var(--color-primary)]"
    >
      Cookie settings
    </button>
  );
}
