import * as React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface WelcomeEmailProps {
  firstName?: string;
  siteUrl?: string;
}

export function WelcomeEmail({ firstName, siteUrl = "https://gomotivateme.com" }: WelcomeEmailProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Hi there";

  return (
    <EmailLayout preheader="2 minutes now, momentum later.">
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {greeting},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        You just joined gomotivateme. Here's the short version: pick a goal, set a
        target, invite a few people you trust, and let them keep you moving. No
        payments, no performative likes — just real encouragement.
      </Text>

      <CTAButton href={`${siteUrl}/dashboard/new`}>Start your first goal</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0", textAlign: "center" }}>
        Or{" "}
        <Link href={`${siteUrl}/#how-it-works`} style={{ color: "#044dfc" }}>
          see how it works
        </Link>{" "}
        first.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
