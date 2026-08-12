import * as React from "react";
import { Text } from "@react-email/components";
import { CTAButton, EmailLayout } from "./components/Layout";

export interface NewFollowerEmailProps {
  followeeName: string;
  followerName: string;
  followerHandle?: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function NewFollowerEmail({
  followeeName,
  followerName,
  followerHandle,
  siteUrl = "https://www.gomotivateme.com",
  unsubscribeToken,
}: NewFollowerEmailProps) {
  const firstName = followeeName?.split(" ")[0] || "there";
  const profileUrl = followerHandle ? `${siteUrl}/u/${followerHandle}` : `${siteUrl}/dashboard`;

  return (
    <EmailLayout
      preheader={`${followerName} is now following you on gomotivateme.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>
        <strong>{followerName}</strong> is now following you and your goals.
      </Text>
      <CTAButton href={profileUrl}>View profile</CTAButton>
    </EmailLayout>
  );
}

const bodyText = { fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" };

export default NewFollowerEmail;
