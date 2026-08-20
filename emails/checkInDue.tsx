import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface CheckInDueEmailProps {
  motivatorName: string;
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  daysSinceLastCheckin: number;
  checkInPath?: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function CheckInDueEmail({
  motivatorName,
  ownerName,
  goalTitle,
  daysSinceLastCheckin,
  checkInPath,
  siteUrl = "https://www.gomotivateme.com",
  unsubscribeToken,
}: CheckInDueEmailProps) {
  const firstName = motivatorName?.split(" ")[0] || "there";
  const href = `${siteUrl}${checkInPath ?? "/motivate"}`;

  return (
    <EmailLayout
      preheader={`It's been ${daysSinceLastCheckin} days since you checked in on ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        You signed up to check in with <strong>{ownerName}</strong> on{" "}
        <strong>{goalTitle}</strong>. It&apos;s been{" "}
        <strong>{daysSinceLastCheckin} day{daysSinceLastCheckin === 1 ? "" : "s"}</strong>{" "}
        since your last check-in.
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        You don&apos;t have to write a novel. A single line like &ldquo;still going?&rdquo; is
        enough.
      </Text>

      <CTAButton href={href}>Send a quick check-in</CTAButton>
    </EmailLayout>
  );
}

export default CheckInDueEmail;
