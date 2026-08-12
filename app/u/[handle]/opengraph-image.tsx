/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SITE_URL as siteUrl } from "@/lib/site";

export const runtime = "edge";
export const alt = "Profile on GoMotivateMe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image for a public profile page.
 * Renders a card with the user's avatar, name, handle, bio, and goal stats.
 */
export default async function ProfileOpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const normalizedHandle = handle.toLowerCase();
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return fallbackImage("Connect Convex to see the profile preview");
  }
  const client = new ConvexHttpClient(convexUrl);

  let summary: any = null;
  let avatarUrl: string | null = null;
  let coverUrl: string | null = null;
  try {
    summary = await client.query(api.users.profileSummary, {
      handle: normalizedHandle,
    });
    if (!summary) {
      return fallbackImage(`@${normalizedHandle} not found`);
    }

    // Fetch avatar + cover URLs
    const imageIds: string[] = [];
    if (summary.user.image) avatarUrl = summary.user.image;
    if (summary.user.coverImageId) imageIds.push(summary.user.coverImageId);
    if (imageIds.length > 0) {
      const urls = await client.query(api.storage.getUrls, {
        ids: imageIds as any,
      });
      if (summary.user.coverImageId) {
        coverUrl = urls[summary.user.coverImageId] ?? null;
      }
    }
  } catch {
    // network/auth errors are fine — render fallback
  }

  if (!summary) {
    return fallbackImage(`@${normalizedHandle} not found`);
  }

  const name = summary.user.name ?? summary.user.handle ?? "Someone";
  const handleStr = summary.user.handle ?? normalizedHandle;
  const bio = summary.user.bio ?? "";
  const goalsCount = summary.stats.goalsCount ?? 0;
  const supportersCount = summary.stats.supportersCount ?? 0;
  const motivatingCount = summary.stats.motivatingCount ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0f",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        {/* A real user cover stays real; the product-owned fallback uses the journey system. */}
        {coverUrl ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
            }}
          >
            <img
              src={coverUrl}
              alt=""
              width={1200}
              height={630}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
            }}
          >
            <img
              src={`${siteUrl}/illustrations/journey/home-community.webp`}
              alt=""
              width={1200}
              height={630}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        {/* Scrim */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "40px 64px 0 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "#2856c7",
                border: "2px solid #feb704",
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              m
            </div>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
              <span style={{ color: "#2856c7" }}>Go</span>
              <span style={{ color: "#feb704" }}>Motivate</span>
              <span style={{ color: "#2856c7" }}>Me</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            flex: 1,
            padding: "0 64px 64px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                width={96}
                height={96}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid rgba(255,255,255,0.3)",
                  display: "flex",
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  fontWeight: 800,
                  border: "3px solid rgba(255,255,255,0.3)",
                }}
              >
                {initialsOf(name)}
              </div>
            )}

            {/* Name + handle */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  display: "flex",
                }}
              >
                {truncate(name, 50)}
              </div>
              <div
                style={{
                  fontSize: 24,
                  opacity: 0.8,
                  display: "flex",
                }}
              >
                @{handleStr}
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio ? (
            <div
              style={{
                fontSize: 20,
                opacity: 0.85,
                marginTop: 20,
                display: "flex",
                maxWidth: 900,
              }}
            >
              {truncate(bio, 160)}
            </div>
          ) : null}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 40,
              marginTop: 28,
              fontSize: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 28, display: "flex" }}>
                {goalsCount}
              </span>
              <span style={{ opacity: 0.7, display: "flex" }}>
                {goalsCount === 1 ? "goal" : "goals"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 28, display: "flex" }}>
                {supportersCount}
              </span>
              <span style={{ opacity: 0.7, display: "flex" }}>
                {supportersCount === 1 ? "supporter" : "supporters"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 28, display: "flex" }}>
                {motivatingCount}
              </span>
              <span style={{ opacity: 0.7, display: "flex" }}>
                {motivatingCount === 1 ? "motivator" : "motivators"}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function fallbackImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "white",
          fontSize: 36,
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 64,
          textAlign: "center",
        }}
      >
        {message}
      </div>
    ),
    { ...size }
  );
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function initialsOf(name: string) {
  const src = name.trim();
  return src
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
