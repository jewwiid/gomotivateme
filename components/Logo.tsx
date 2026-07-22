import Link from "next/link";

/**
 * gomotivateme brand system.
 *
 * The mark is an upward momentum glyph (a rising bar/chevron stack) set in a
 * rounded-square tile with a cobalt→sky gradient and a gold spark — the three
 * signature colors from the brand kit. It reads as "forward motion / momentum",
 * which is the product's core idea.
 *
 * Colors reference the CSS custom properties in globals.css so the mark
 * automatically adapts to light/dark surfaces.
 */

const GOLD = "#f0b429";
const COBALT = "#2541d8";
const SKY = "#82d9ff";

/**
 * The brand mark — the momentum glyph in its tile. Use standalone for favicons,
 * app icons, or compact placements.
 */
export function LogoMark({
  size = 32,
  className,
  title = "gomotivateme",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* Tile */}
      <defs>
        <linearGradient id="gmm-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={COBALT} />
          <stop offset="1" stopColor={SKY} />
        </linearGradient>
        <linearGradient id="gmm-bar" x1="6" y1="24" x2="26" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#eaf6ff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#gmm-tile)" />
      {/* Upward momentum: three rising bars + an arrow chevron */}
      <g fill="url(#gmm-bar)">
        <rect x="7.5" y="18" width="4" height="6.5" rx="1.25" />
        <rect x="14" y="13.5" width="4" height="11" rx="1.25" />
        <rect x="20.5" y="9" width="4" height="15.5" rx="1.25" />
      </g>
      {/* Arrow tip pointing up-right, suggesting growth */}
      <path
        d="M11 11.2 L16.8 7.6 L18.6 10.4 L12.8 14 Z"
        fill={GOLD}
      />
      <path
        d="M16.8 7.6 L20.5 9.4 L19.9 12.2 Z"
        fill="#f5c33b"
      />
    </svg>
  );
}

/**
 * Full lockup: mark + wordmark. Defaults to linking home.
 *
 * @param variant  "light" renders dark text (for light surfaces);
 *                 "dark" renders light text (for dark surfaces).
 */
export function Logo({
  variant = "light",
  showWordmark = true,
  href = "/",
  markSize = 32,
  className,
}: {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  href?: string | null;
  markSize?: number;
  className?: string;
}) {
  const wordmark = (
    <span
      className={`text-lg font-semibold tracking-tight ${
        variant === "dark" ? "text-white" : "text-[var(--color-text)]"
      }`}
      style={{ fontFamily: "var(--font-jakarta, inherit)" }}
    >
      gomotivateme
    </span>
  );

  const content = (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={markSize} />
      {showWordmark && wordmark}
    </span>
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
