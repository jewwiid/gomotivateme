import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface DeadlineApproachingEmailProps {
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  daysRemaining: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPct: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function DeadlineApproachingEmail({
  ownerName,
  goalTitle,
  goalSlug,
  daysRemaining,
  currentValue,
  targetValue,
  unit,
  progressPct,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: DeadlineApproachingEmailProps) {
  const firstName = ownerName?.split(" ")[0] || "there";

  return (
    <EmailLayout
      preheader={`${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{goalTitle}</strong> has{" "}
        <strong>{daysRemaining} day{daysRemaining === 1 ? "" : "s"}</strong>{" "}
        until your target date.
      </Text>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "0 0 8px" }}>
        <strong>Progress:</strong> {currentValue} / {targetValue} {unit} ({Math.round(progressPct)}%)
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {progressPct >= 75
          ? "You're close. One final push — post an update and finish strong."
          : progressPct >= 50
            ? "You're past the halfway mark. A strong final stretch can close the gap."
            : "There's still time to rally. Post an update today and let your supporters know you're pushing to the end."}
      </Text>

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>Post a final stretch update</CTAButton>
    </EmailLayout>
  );
}

export default DeadlineApproachingEmail;