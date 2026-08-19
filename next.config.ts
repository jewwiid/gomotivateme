import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Preserve old shared image URLs while serving the stable journey system.
      { source: "/og-default.png", destination: "/opengraph-image", permanent: true },
      { source: "/og-default-bg.png", destination: "/opengraph-image", permanent: true },
      { source: "/brand/legacy-home-opengraph-image.jpg", destination: "/opengraph-image", permanent: true },

      { source: "/illustrations/empty-goals.png", destination: "/illustrations/journey/begin.webp", permanent: true },
      { source: "/illustrations/empty-new-beginning-v3.webp", destination: "/illustrations/journey/begin.webp", permanent: true },
      { source: "/illustrations/empty-state.png", destination: "/illustrations/journey/begin.webp", permanent: true },
      { source: "/illustrations/hero.png", destination: "/illustrations/journey/home-community.webp", permanent: true },
      { source: "/illustrations/hero-v2.png", destination: "/illustrations/journey/home-community.webp", permanent: true },
      { source: "/illustrations/hero-community-v3.webp", destination: "/illustrations/journey/home-community.webp", permanent: true },
      { source: "/illustrations/motivation-circle.png", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/motivation-circle-v3.webp", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/not-found.png", destination: "/illustrations/journey/return.webp", permanent: true },
      { source: "/illustrations/recap-summit.png", destination: "/illustrations/journey/summit.webp", permanent: true },
      { source: "/illustrations/welcome.png", destination: "/illustrations/journey/begin.webp", permanent: true },

      { source: "/illustrations/steps/set.png", destination: "/illustrations/journey/begin.webp", permanent: true },
      { source: "/illustrations/steps/plan-v3.webp", destination: "/illustrations/journey/begin.webp", permanent: true },
      { source: "/illustrations/steps/move-v3.webp", destination: "/illustrations/journey/move.webp", permanent: true },
      { source: "/illustrations/steps/track.png", destination: "/illustrations/journey/move.webp", permanent: true },
      { source: "/illustrations/steps/share.png", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/steps/share-v3.webp", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/steps/team.png", destination: "/illustrations/journey/home-community.webp", permanent: true },
      { source: "/illustrations/steps/together-v3.webp", destination: "/illustrations/journey/home-community.webp", permanent: true },

      { source: "/illustrations/support/advice.png", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/support/checkin.png", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/support/encourage.png", destination: "/illustrations/journey/support.webp", permanent: true },
      { source: "/illustrations/support/join.png", destination: "/illustrations/journey/support.webp", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
