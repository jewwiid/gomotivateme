import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/lib/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "myodyssey — set a goal, share the journey",
  description:
    "Set a goal, get a public link, and let the people cheering you on drop thumbs-ups and notes as you work toward your target date.",
  openGraph: {
    title: "myodyssey",
    description: "Set a goal. Share a link. Crowdsource the motivation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
