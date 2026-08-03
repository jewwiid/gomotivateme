import Link from "next/link";

/** The product wordmark paired with the official GoMotivateMe brand mark. */

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
      className={`inline-flex items-center gap-[0.42em] font-semibold leading-none tracking-[-0.035em] text-[var(--color-text)] antialiased ${
        sizeMap[size]
      } ${className ?? ""}`}
    >
      <span aria-hidden className="relative h-[1.05em] w-[1.05em] shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apple-icon.png"
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full scale-[1.55] object-contain"
        />
      </span>
      <span>GoMotivateMe</span>
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
