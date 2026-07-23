import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface SupportMessageReceivedEmailProps {
  ownerName: string;
  authorName: string;
  goalTitle: string;
  goalSlug: string;
  messageExcerpt: string;
  supportTypeLabel: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function SupportMessageReceivedEmail({
  ownerName,
  authorName,
  goalTitle,
  goalSlug,
  messageExcerpt,
  supportTypeLabel,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: SupportMessageReceivedEmailProps) {
  return (
    <EmailLayout
      preheader={`${authorName} sent you ${supportTypeLabel}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {ownerName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{authorName}</strong> left you some <strong>{supportTypeLabel}</strong> on{" "}
        <strong>{goalTitle}</strong>.
      </Text>

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
        &ldquo;{messageExcerpt}&rdquo;
      </Text>

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>Read it on your goal</CTAButton>
    </EmailLayout>
  );
}

export default SupportMessageReceivedEmail;
