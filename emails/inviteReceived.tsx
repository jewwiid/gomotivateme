import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface InviteReceivedEmailProps {
  ownerName: string;
  goalTitle: string;
  inviteMessage?: string;
  roleLabel: string;
  inviteToken: string;
  siteUrl?: string;
}

export function InviteReceivedEmail({
  ownerName,
  goalTitle,
  inviteMessage,
  roleLabel,
  inviteToken,
  siteUrl = "https://gomotivateme.com",
}: InviteReceivedEmailProps) {
  const excerpt = inviteMessage?.slice(0, 160);

  return (
    <EmailLayout
      preheader={`They picked you for ${goalTitle}.`}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{ownerName}</strong> is working on <strong>{goalTitle}</strong> and added you as a
        potential motivator.
      </Text>

      {excerpt && (
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
          “{excerpt}”
        </Text>
      )}

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "0 0 8px" }}>
        <strong>The role they're hoping you'll play:</strong> {roleLabel}
      </Text>

      <CTAButton href={`${siteUrl}/invite/${inviteToken}`}>Accept invite</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        Not for you right now? You can{" "}
        <a
          href={`${siteUrl}/invite/${inviteToken}?action=decline`}
          style={{ color: "#044dfc" }}
        >
          decline gracefully
        </a>{" "}
        — no hard feelings.
      </Text>
    </EmailLayout>
  );
}

export default InviteReceivedEmail;
