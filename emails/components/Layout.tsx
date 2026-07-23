import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Link,
  Hr,
} from "@react-email/components";

/**
 * Shared brand shell for every gomotivateme email.
 *
 * Design tokens match the web app:
 *   cobalt #044dfc (primary / CTA), gold #feb604 (accent),
 *   off-white #fafaf6 (surface), #202124 (body text).
 *
 * Voice: warm, direct, "the friend who actually shows up."
 */

const COBALT = "#044dfc";
const GOLD = "#feb604";
const BG = "#fafaf6";
const SURFACE = "#ffffff";
const TEXT = "#202124";
const MUTED = "#6c706f";

export function EmailLayout({
  preheader,
  children,
  unsubscribeUrl,
  footerNote,
}: {
  preheader: string;
  children: React.ReactNode;
  /** Optional per-recipient unsubscribe link (lifecycle emails only). */
  unsubscribeUrl?: string;
  /** Extra footer text, e.g. physical address placeholder. */
  footerNote?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Wordmark header */}
          <Section style={header}>
            <Text style={wordmark}>
              <span style={{ color: COBALT }}>Go</span>
              <span style={{ color: GOLD }}>Motivate</span>
              <span style={{ color: COBALT }}>Me</span>
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {footerNote ?? "You're getting this because you have a goal on gomotivateme."}
            </Text>
            {unsubscribeUrl ? (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={footerLink}>
                  Unsubscribe
                </Link>{" "}
                ·{" "}
                <Link href="https://gomotivateme.com/settings" style={footerLink}>
                  Email preferences
                </Link>
              </Text>
            ) : (
              <Text style={footerText}>
                This is a service message about your account. You can't opt out of it.
              </Text>
            )}
            <Text style={footerMuted}>
              gomotivateme · 47A The Drive, Rush, Co. Dublin, K56 KP73, Ireland
            </Text>
            <Text style={footerMuted}>
              Where personal goals get done.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Reusable CTA button — the single primary action per email. */
export function CTAButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0" }}>
      <Button style={ctaButton} href={href}>
        {children}
      </Button>
    </Section>
  );
}

export { COBALT, GOLD, BG, TEXT, MUTED };

// --- styles -----------------------------------------------------------------

const body: React.CSSProperties = {
  backgroundColor: BG,
  fontFamily:
    "'Plus Jakarta Sans', 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container: React.CSSProperties = {
  backgroundColor: SURFACE,
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "520px",
  padding: "0",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  padding: "28px 40px 8px",
};

const wordmark: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  letterSpacing: "-0.6px",
  margin: 0,
};

const content: React.CSSProperties = {
  padding: "8px 40px 16px",
};

const hr: React.CSSProperties = {
  borderColor: "#e4e4dc",
  margin: "0 40px",
};

const footer: React.CSSProperties = {
  padding: "20px 40px 32px",
};

const footerText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: MUTED,
  margin: "0 0 8px",
};

const footerMuted: React.CSSProperties = {
  fontSize: "12px",
  color: "#9aa0a0",
  margin: "12px 0 0",
};

const footerLink: React.CSSProperties = {
  color: COBALT,
  textDecoration: "underline",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: COBALT,
  borderRadius: "10px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "14px 32px",
  textDecoration: "none",
};
