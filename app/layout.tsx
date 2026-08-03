import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ConvexClientProvider } from "@/lib/ConvexClientProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gomotivateme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GoMotivateMe — Where personal goals get done",
  description:
    "Set a goal, build a support team, and keep going with encouragement from people who want to see you succeed.",
  openGraph: {
    title: "GoMotivateMe — Where personal goals get done",
    description:
      "Set a goal, build a support team, and keep going with encouragement from people who want to see you succeed.",
    type: "website",
    siteName: "GoMotivateMe",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoMotivateMe — Where personal goals get done",
    description:
      "Set a goal, build a support team, and keep going with encouragement from people who want to see you succeed.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f8f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <ConvexClientProvider>
          {children}
          <SiteFooter />
          <CookieConsent />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
