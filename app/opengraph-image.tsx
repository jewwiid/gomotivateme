/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GoMotivateMe — Goals are harder to quit when people show up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gomotivateme.com";

/** Editorial social card for the homepage and other routes without their own image. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#f6f8f7",
          color: "#101714",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: 770,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "54px 62px 48px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={`${siteUrl}/apple-icon.png`}
                alt=""
                width={48}
                height={48}
                style={{ width: 48, height: 48, objectFit: "contain", transform: "scale(1.55)" }}
              />
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -1.2 }}>
              GoMotivateMe
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 62,
              color: "#2856d9",
              fontFamily: "monospace",
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: 0.2,
            }}
          >
            A public home for personal goals
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              maxWidth: 660,
              fontSize: 70,
              fontWeight: 700,
              lineHeight: 0.94,
              letterSpacing: -4.2,
            }}
          >
            Goals are harder to quit when people show up.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              maxWidth: 620,
              borderTop: "1px solid #b9c1bd",
              paddingTop: 20,
              color: "#5d6763",
              fontSize: 21,
              lineHeight: 1.35,
            }}
          >
            Set the goal. Share the work. Let your people help you keep going.
          </div>
        </div>

        <div
          style={{
            width: 430,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            padding: "48px 48px 44px",
            background: "#121816",
            color: "#f4f7f5",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 68,
              height: 68,
              right: 0,
              top: 0,
              display: "flex",
              background: "#2856d9",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingRight: 44,
              color: "#9eaaa5",
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            <span>Goal record / 001</span>
            <span style={{ color: "#8cabff" }}>Public</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 104 }}>
            <div style={{ display: "flex", color: "#aeb8b4", fontSize: 18 }}>
              A goal worth finishing
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 0.98,
                letterSpacing: -2.2,
              }}
            >
              One clear page. Real progress. People showing up.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              borderTop: "1px solid #35403c",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#aeb8b4",
                fontFamily: "monospace",
                fontSize: 14,
              }}
            >
              <span>Progress</span>
              <span>Keep going</span>
            </div>
            <div style={{ display: "flex", height: 5, marginTop: 16, background: "#35403c" }}>
              <div style={{ display: "flex", width: "64%", height: "100%", background: "#6f91ff" }} />
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
