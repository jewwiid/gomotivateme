import Link from "next/link";
import Image from "next/image";

/**
 * GoMotivateMe brand system.
 *
 * Brand assets live in /public/brand/:
 *   - GoMotivateMe_Logo.png          the icon/mark (1000×1000, colored)
 *   - GoMotivateMe_Wordmark.png      the wordmark text (2172×724, 2-tone)
 *   - GoMotivateMe_Wordmark.svg      clean vector source of the wordmark
 *   - GoMotivateMe_Logo_Wordmark.png mark + wordmark lockup
 *
 * The mark ships only as a raster PNG (no vector source exists), so LogoMark
 * renders it via next/image. The wordmark is a single two-tone lockup
 * ("Go" blue · "Motivate" gold · "Me" blue) — render it whole rather than
 * reconstructing the split from text, to stay faithful to the official asset.
 *
 * Colors: brand blue #044dfc, brand gold #feb604.
 */

const MARK_SRC = "/brand/GoMotivateMe_Logo.png";
const WORDMARK_SRC = "/brand/GoMotivateMe_Wordmark.png";

/**
 * The brand mark — the GoMotivateMe icon. Square, renders at `size`×`size`.
 */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={MARK_SRC}
      alt="GoMotivateMe"
      width={size}
      height={size}
      className={className}
      // The mark has transparent corners; let the parent clip if it needs to.
      unoptimized={false}
    />
  );
}

/**
 * Full lockup: mark + wordmark. Defaults to linking home.
 *
 * @param markSize  square size of the icon mark in px (default 32)
 * @param href      link target; pass null to render without a link wrapper
 */
export function Logo({
  href = "/",
  markSize = 32,
  className,
}: {
  href?: string | null;
  markSize?: number;
  className?: string;
} = {}) {
  // Wordmark image is 2172×724 → aspect ~3.0028:1. Size it to match the mark height.
  const wordmarkWidth = Math.round(markSize * (2172 / 724) * 1.15);
  const wordmarkHeight = Math.round(markSize * 1.15);

  const content = (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={markSize} />
      <Image
        src={WORDMARK_SRC}
        alt="GoMotivateMe"
        width={wordmarkWidth}
        height={wordmarkHeight}
        className="h-auto"
      />
    </span>
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
