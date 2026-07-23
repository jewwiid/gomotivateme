import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface NewUpdateEmailProps {
  motivatorName: string;
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  updateExcerpt?: string;
  valueLabel?: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function NewUpdateEmail({
  motivatorName,
  ownerName,
  goalTitle,
  goalSlug,
  updateExcerpt,
  valueLabel,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: NewUpdateEmailProps) {
  return (
    <EmailLayout
      preheader={`${ownerName} posted an update on ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {motivatorName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{ownerName}</strong> just posted an update on{" "}
        <strong>{goalTitle}</strong>.
      </Text>

      {valueLabel && (
        <Text style={{ fontSize: "15px", color: "#6c706f", margin: "0 0 8px" }}>
          <strong>Progress:</strong> {valueLabel}
        </Text>
      )}
      {updateExcerpt && (
        <Text
          style={{
            fontSize: "15px",
            lineHeight: "1.5",
            color: "#6c706f",
            fontStyle: "italic",
            borderLeft: `3px solid #044dfc`,
            paddingLeft: "16px",
            margin: "0 0 24px",
          }}
        >
          &ldquo;{updateExcerpt}&rdquo;
        </Text>
      )}

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>Cheer them on</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        You&apos;re on their team. A few words from you can help today.
      </Text>
    </EmailLayout>
  );
}

export default NewUpdateEmail;
