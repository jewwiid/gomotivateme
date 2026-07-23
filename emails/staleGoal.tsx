import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface StaleGoalEmailProps {
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  daysSinceLastUpdate: number;
  supporterCount: number;
  motivatorCount: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function StaleGoalEmail({
  ownerName,
  goalTitle,
  goalSlug,
  daysSinceLastUpdate,
  supporterCount,
  motivatorCount,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: StaleGoalEmailProps) {
  const firstName = ownerName?.split(" ")[0] || "there";
  const hasTeam = supporterCount > 0 || motivatorCount > 0;

  return (
    <EmailLayout
      preheader={`It's been ${daysSinceLastUpdate} days since you updated ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        It&apos;s been{" "}
        <strong>{daysSinceLastUpdate} day{daysSinceLastUpdate === 1 ? "" : "s"}</strong>{" "}
        since you posted an update on{" "}
        <strong>{goalTitle}</strong>.
      </Text>

      {hasTeam ? (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          {motivatorCount > 0 && supporterCount > 0
            ? `You have ${motivatorCount} motivator${motivatorCount === 1 ? "" : "s"} and ${supporterCount} supporter${supporterCount === 1 ? "" : "s"}`
            : motivatorCount > 0
              ? `You have ${motivatorCount} motivator${motivatorCount === 1 ? "" : "s"}`
              : `You have ${supporterCount} supporter${supporterCount === 1 ? "" : "s"}`}
          {" "}waiting to hear from you. They&apos;re rooting for you. Don&apos;t leave them in the dark.
        </Text>
      ) : (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          Even a quick &ldquo;still going&rdquo; counts as an update. Progress
          isn&apos;t always a big leap.
        </Text>
      )}

      <CTAButton href={`${siteUrl}/dashboard`}>Post an update</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        It takes 30 seconds. A photo, a number, a sentence. Whatever shows
        you&apos;re still in the fight.
      </Text>
    </EmailLayout>
  );
}

export default StaleGoalEmail;