import { Wordmark } from "@/components/Wordmark";

/**
 * @deprecated Use `<Wordmark />` directly. This re-export exists for
 * backward compatibility with code that still imports `Logo`.
 *
 * The UI wordmark combines the official brand icon with live text so the
 * mark remains recognizable while the name stays crisp at every size.
 */

type LogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  height?: never; // accepted-and-ignored for old callers passing `height`
};

export function Logo(props: LogoProps) {
  // Pick a size based on the old `height` value if it's still being passed.
  // Otherwise use the explicit `size` prop, defaulting to "lg".
  const { height, size, ...rest } = props as LogoProps & { height?: number };
  let resolvedSize: "sm" | "md" | "lg" | "xl" | "2xl" = size ?? "lg";
  if (typeof height === "number") {
    if (height <= 22) resolvedSize = "sm";
    else if (height <= 26) resolvedSize = "md";
    else if (height <= 32) resolvedSize = "lg";
    else if (height <= 40) resolvedSize = "xl";
    else resolvedSize = "2xl";
  }
  return <Wordmark size={resolvedSize} {...rest} />;
}
