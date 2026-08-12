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
              GoMotivateMe
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
            padding: "48px 40px 40px",
            background: "#e5ebfa",
            color: "#18201c",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 82,
              height: 82,
              right: 0,
              top: 0,
              display: "flex",
              borderRadius: "0 0 0 36px",
              background: "#2856c7",
            }}
          />

          <div
            style={{
              display: "flex",
              maxWidth: 310,
              color: "#2856c7",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            People are better than push notifications.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 58,
              padding: "24px 26px",
              borderRadius: 24,
              background: "#fffefb",
              boxShadow: "0 18px 40px rgba(51, 47, 38, 0.10)",
              transform: "rotate(-2deg)",
            }}
          >
            <div style={{ display: "flex", color: "#66706b", fontSize: 15 }}>
              Jude is working on
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -1.5,
              }}
            >
              Launch ReelClip
            </div>
            <div style={{ display: "flex", marginTop: 24, height: 7, borderRadius: 99, background: "#e8e3d8" }}>
              <div style={{ display: "flex", width: "38%", height: "100%", borderRadius: 99, background: "#2856c7" }} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 20,
              marginLeft: 42,
              padding: "22px 24px",
              borderRadius: 24,
              background: "#18201c",
              color: "#fffefb",
              transform: "rotate(2deg)",
            }}
          >
            <div style={{ display: "flex", color: "#c8d0cc", fontSize: 15 }}>
              3 people showed up
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 27, fontWeight: 700, lineHeight: 1.05 }}>
              “Keep going. The next version is closer.”
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
