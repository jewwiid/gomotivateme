/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "edge";
export const alt = "Goal on gomotivateme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image for a public goal page.
 * Pulls the goal data via Convex's HTTP client and renders a GoFundMe-style
 * card with the cover photo, title, progress, and organizer name.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return fallbackImage("Connect Convex to see the goal preview");
  }
  const client = new ConvexHttpClient(convexUrl);

  let goal: any = null;
  let coverUrl: string | null = null;
  let cheerTotal = 0;
  try {
    goal = await client.query(api.public.getGoalBySlug, { slug });
    if (goal?.coverImageId) {
      const urls = await client.query(api.storage.getUrls, {
        ids: [goal.coverImageId],
      });
      coverUrl = urls[goal.coverImageId] ?? null;
    }
    // Fetch the real cheer count (getGoalBySlug doesn't return it).
    const stats = await client.query(api.reactions.publicStats, { goalId: goal._id });
    cheerTotal = stats?.emojiTotal ?? 0;
  } catch {
    // network/auth errors are fine — render fallback
  }
  if (!goal) {
    return fallbackImage(`Goal not found · ${slug}`);
  }

  const pct = Math.round(goal.progress);
  const total = cheerTotal;
  const title = goal.title;
  const owner = goal.ownerName ?? "Someone";
  const sub = goal.story ? truncate(goal.story, 140) : `${goal.currentValue} of ${goal.targetValue} ${goal.unit} complete`;

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
        {/* Cover or gradient background */}
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
              background: "linear-gradient(135deg, #2541D8 0%, #82D9FF 100%)",
              opacity: 0.95,
            }}
          />
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
                background: "linear-gradient(135deg, #2541D8 0%, #82D9FF 100%)",
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              m
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
              gomotivateme
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.8,
              display: "flex",
            }}
          >
            {goal.category}
          </div>
        </div>

        {/* Title block */}
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
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -1,
                display: "flex",
              }}
            >
              {truncate(title, 80)}
            </div>
            <div
              style={{
                fontSize: 20,
                opacity: 0.85,
                display: "flex",
              }}
            >
              {sub}
            </div>

            {/* Progress bar */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 16,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #ff7849 0%, #fbbf24 100%)",
                    display: "flex",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  display: "flex",
                  minWidth: 80,
                  justifyContent: "flex-end",
                }}
              >
                {pct}%
              </div>
            </div>

            {/* Footer stats */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                fontSize: 16,
                opacity: 0.85,
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex" }}>
                by {owner}
              </div>
              <div style={{ display: "flex" }}>
                💪 {total} {total === 1 ? "cheer" : "cheers"}
              </div>
              <div style={{ display: "flex" }}>
                {goal.daysRemaining >= 0
                  ? `${goal.daysRemaining} days left`
                  : "Past target"}
              </div>
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
