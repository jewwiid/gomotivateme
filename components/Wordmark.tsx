import Link from "next/link";

/**
 * GoMotivateMe wordmark — rendered as text in the loaded display font
 * (Plus Jakarta Sans, weight 800, tight tracking) rather than a raster/SVG
 * asset. This way it:
 *   - scales crisply at every size,
 *   - inherits the loaded font so titles and wordmark are visually consistent,
 *   - allows per-glyph color ("Motivate" in brand gold, the rest in brand blue).
 *
 * Replaces the old image-based <Logo />. The PNG/SVG assets in /public/brand/
 * are still used for the favicon, OG image, and emails.
 */

type WordmarkSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<WordmarkSize, string> = {
  sm: "text-base",     //  16px
  md: "text-xl",       //  20px
  lg: "text-2xl",      //  24px — default, used in header
  xl: "text-3xl",      //  30px — footer
  "2xl": "text-4xl",   //  36px
};

type Props = {
  /** Size preset. Default `lg` (24px) — generous enough to feel like a wordmark. */
  size?: WordmarkSize;
  /** Link target. Pass `null` to render without a link wrapper. */
  href?: string | null;
  className?: string;
  ariaLabel?: string;
};

export function Wordmark({
  size = "lg",
  href = "/",
  className,
  ariaLabel = "GoMotivateMe",
}: Props) {
  const text = (
    <span
      aria-label={ariaLabel}
      className={`inline-flex items-baseline font-extrabold leading-none tracking-[-0.045em] antialiased ${
        sizeMap[size]
      } ${className ?? ""}`}
    >
      <span style={{ color: "var(--color-primary)" }}>Go</span>
      <span style={{ color: "var(--color-gold)" }}>Motivate</span>
      <span style={{ color: "var(--color-primary)" }}>Me</span>
    </span>
  );

  if (href === null) return text;
  return (
    <Link
      href={href}
      className="inline-block transition-opacity hover:opacity-80"
    >
      {text}
    </Link>
  );
}
