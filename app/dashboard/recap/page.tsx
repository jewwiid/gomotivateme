import type { Metadata } from "next";
import { RecapRoute } from "./RecapExperience";

export const metadata: Metadata = {
  title: "Your year in motion — GoMotivateMe",
  description: "A personal look back at the goals, progress, and people that moved your year forward.",
  robots: { index: false, follow: false },
};

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const requestedYear = Number(params.year);
  const year =
    Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= now.getFullYear()
      ? requestedYear
      : now.getFullYear() - 1;
  const previewEnabled =
    process.env.NODE_ENV !== "production" || process.env.RECAP_PREVIEW === "1";
  const preview = previewEnabled && params.preview === "1";

  return <RecapRoute preview={preview} year={year} />;
}
