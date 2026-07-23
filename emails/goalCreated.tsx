import * as React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface GoalCreatedEmailProps {
  firstName?: string;
  goalTitle: string;
  slug: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function GoalCreatedEmail({
  firstName,
  goalTitle,
  slug,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: GoalCreatedEmailProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Hi there";

  return (
    <EmailLayout
      preheader="Your goal is live. Here's what happens next."
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {greeting},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        <strong>{goalTitle}</strong> is live on gomotivateme. You've put a stake in the
        ground. That's the hardest part.
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Now: post your first update, invite a few
        people who'll cheer you on, and let them keep you going.
      </Text>

      <CTAButton href={`${siteUrl}/o/${slug}`}>View your goal</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0", textAlign: "center" }}>
        Or{" "}
        <Link href={`${siteUrl}/dashboard`} style={{ color: "#044dfc" }}>
          go to your dashboard
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}

export default GoalCreatedEmail;
