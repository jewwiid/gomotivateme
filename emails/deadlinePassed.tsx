import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface DeadlinePassedEmailProps {
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  daysOverdue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPct: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function DeadlinePassedEmail({
  ownerName,
  goalTitle,
  goalSlug,
  daysOverdue,
  currentValue,
  targetValue,
  unit,
  progressPct,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: DeadlinePassedEmailProps) {
  const firstName = ownerName?.split(" ")[0] || "there";

  return (
    <EmailLayout
      preheader={`Your target date passed ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        The target date for <strong>{goalTitle}</strong> passed{" "}
        <strong>{daysOverdue} day{daysOverdue === 1 ? "" : "s"} ago</strong>.
      </Text>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "0 0 8px" }}>
        <strong>Progress:</strong> {currentValue} / {targetValue} {unit} ({Math.round(progressPct)}%)
      </Text>

      {progressPct >= 90 ? (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          You&apos;re almost there. Don&apos;t let the
          deadline pass without a final update. Post one now and close it out.
        </Text>
      ) : progressPct >= 50 ? (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          You made real progress. The deadline passed, but the goal
          doesn&apos;t have to. Post an update. Your supporters are still here.
        </Text>
      ) : (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          The deadline passed, but the goal doesn&apos;t have to end here.
          Lots of worthwhile goals take longer than expected. Post an update
          and let your supporters know what&apos;s next.
        </Text>
      )}

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>Post an update</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        You can also extend your deadline from the dashboard if you need more time.
      </Text>
    </EmailLayout>
  );
}

export default DeadlinePassedEmail;