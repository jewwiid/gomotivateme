import * as React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface PartnerSyncEmailProps {
  firstName?: string;
  kind: string;
  title: string;
  gmmUrl?: string;
  aiblUrl?: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function PartnerSyncEmail({
  firstName,
  kind,
  title,
  gmmUrl,
  aiblUrl = "https://www.iamaibl.com",
  siteUrl = "https://www.gomotivateme.com",
  unsubscribeToken,
}: PartnerSyncEmailProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Hi there";
  const connected = kind === "connected";
  const toAibl = kind === "goal_to_aibl";
  const heading = connected
    ? "AI Boss Leader is connected"
    : toAibl
    ? `${title} is now a campaign in AI Boss Leader`
    : `${title} is synced with GoMotivateMe`;
  const body = connected
    ? "Your GoMotivateMe and AI Boss Leader accounts can now share goals, campaigns, tasks, and updates both ways."
    : toAibl
    ? "You can plan and complete tasks in AI Boss Leader. Progress will still show on your public GoMotivateMe page."
    : "Work on this in either app. Completing a task or posting an update will sync to the other side.";

  return (
    <EmailLayout
      preheader={heading}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {greeting},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {body}
      </Text>
      <CTAButton href={toAibl ? aiblUrl : gmmUrl || `${siteUrl}/dashboard`}>
        {toAibl ? "Open AI Boss Leader" : "Open GoMotivateMe"}
      </CTAButton>
      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "16px 0 0", textAlign: "center" }}>
        {toAibl ? (
          <>
            Or{" "}
            <Link href={gmmUrl || `${siteUrl}/dashboard`} style={{ color: "#044dfc" }}>
              view the goal
            </Link>
            .
          </>
        ) : (
          <>
            Or{" "}
            <Link href={aiblUrl} style={{ color: "#044dfc" }}>
              open AI Boss Leader
            </Link>
            .
          </>
        )}
      </Text>
    </EmailLayout>
  );
}

export default PartnerSyncEmail;
