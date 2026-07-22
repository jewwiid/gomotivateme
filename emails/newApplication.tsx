import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface NewApplicationEmailProps {
  ownerName: string;
  motivatorName: string;
  goalTitle: string;
  goalSlug: string;
  roleLabel: string;
  applicationMessage: string;
  siteUrl?: string;
}

export function NewApplicationEmail({
  ownerName,
  motivatorName,
  goalTitle,
  goalSlug,
  roleLabel,
  applicationMessage,
  siteUrl = "https://gomotivateme.com",
}: NewApplicationEmailProps) {
  const excerpt = applicationMessage.slice(0, 140);

  return (
    <EmailLayout preheader={`Application: ${roleLabel}. Accept or pass.`}>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {ownerName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{motivatorName}</strong> applied to be your <strong>{roleLabel}</strong> on{" "}
        <strong>{goalTitle}</strong>.
      </Text>

      {excerpt && (
        <Text
          style={{
            fontSize: "15px",
            lineHeight: "1.5",
            color: "#6c706f",
            fontStyle: "italic",
            borderLeft: `3px solid #feb604`,
            paddingLeft: "16px",
            margin: "0 0 24px",
          }}
        >
          “{excerpt}”
        </Text>
      )}

      <CTAButton href={`${siteUrl}/o/${goalSlug}/applicants`}>Review application</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        You can approve, decline, or just sit on it for a bit. No rush.
      </Text>
    </EmailLayout>
  );
}

export default NewApplicationEmail;
