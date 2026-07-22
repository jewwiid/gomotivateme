import Link from "next/link";
import Image from "next/image";

/**
 * GoMotivateMe brand system.
 *
 * Brand assets live in /public/brand/:
 *   - GoMotivateMe_Logo.png          the icon/mark — used only for the favicon
 *                                     and apple-touch-icon (app/icon.png,
 *                                     app/apple-icon.png), NOT in the UI.
 *   - GoMotivateMe_Wordmark.png      the two-tone wordmark — used in the
 *                                     header and footer via <Logo/>.
 *   - GoMotivateMe_Wordmark.svg      clean vector source of the wordmark.
 *   - GoMotivateMe_Logo_Wordmark.png mark + wordmark lockup (unused in UI).
 *
 * The mark ships only as a raster PNG (no vector source exists). The wordmark
 * is a single two-tone lockup ("Go" blue · "Motivate" gold · "Me" blue) —
 * render it whole rather than reconstructing the split from text, to stay
 * faithful to the official asset.
 *
 * Colors: brand blue #044dfc, brand gold #feb604.
 */

const WORDMARK_SRC = "/brand/GoMotivateMe_Wordmark.png";
// Wordmark intrinsic size: 2172×724 → aspect ratio ≈ 3.003:1.
const WORDMARK_ASPECT = 2172 / 724;

/**
 * Full wordmark lockup. Defaults to linking home.
 *
 * Used in the header and footer — the icon mark is intentionally not shown
 * here (it lives only in the favicon/browser chrome).
 *
 * @param height  rendered height of the wordmark in px (default 28)
 * @param href    link target; pass null to render without a link wrapper
 */
export function Logo({
  href = "/",
  height = 28,
  className,
}: {
  href?: string | null;
  height?: number;
  className?: string;
} = {}) {
  const width = Math.round(height * WORDMARK_ASPECT);

  const content = (
    <Image
      src={WORDMARK_SRC}
      alt="GoMotivateMe"
      width={width}
      height={height}
      className={`h-auto ${className ?? ""}`}
    />
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}

