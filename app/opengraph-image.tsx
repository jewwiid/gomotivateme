/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { SITE_URL as siteUrl } from "@/lib/site";

export const runtime = "edge";
export const alt = "GoMotivateMe — Big goals feel lighter with people beside you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#fbfaf6",
          color: "#18201c",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: 730,
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
              <span style={{ color: "#2856c7" }}>Go</span>
              <span style={{ color: "#feb704" }}>Motivate</span>
              <span style={{ color: "#2856c7" }}>Me</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 56,
              color: "#1c419f",
              background: "#e5ebfa",
              borderRadius: 999,
              padding: "9px 16px",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            A public home for goals worth finishing
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              maxWidth: 625,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 0.94,
              letterSpacing: -4.2,
            }}
          >
            Big goals feel lighter with people beside you.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              maxWidth: 620,
              borderTop: "1px solid #cfc8bc",
              paddingTop: 20,
              color: "#66706b",
              fontSize: 21,
              lineHeight: 1.35,
            }}
          >
            Share honest progress. Ask for the support you need. Keep going together.
          </div>
        </div>

        <div
          style={{
            width: 470,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            background: "#fbfaf6",
            color: "#18201c",
          }}
        >
          <img
            src={`${siteUrl}/illustrations/journey/home-community.webp`}
            alt=""
            width={630}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "flex" }}
          />
          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              bottom: 28,
              display: "flex",
              padding: "16px 18px",
              borderLeft: "4px solid #feb704",
              background: "rgba(251,250,246,0.92)",
              color: "#18201c",
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            Progress is personal. Support makes it shared.
          </div>
        </div>
      </div>
    ),
    size
  );
}
