/**
 * Pass-through layout for the legacy single-segment goal redirect route.
 * The page.tsx in this directory handles the redirect; this layout just
 * renders children unchanged.
 */
export default function LegacyGoalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
