import * as React from "react";
import { Text, Link } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface TargetHitEmailProps {
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  unit: string;
  targetValue: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function TargetHitEmail({
  ownerName,
  goalTitle,
  goalSlug,
  unit,
  targetValue,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: TargetHitEmailProps) {
  const firstName = ownerName?.split(" ")[0] || "there";

  return (
    <EmailLayout
      preheader={`You did it — ${goalTitle} is complete.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        You hit your target on <strong>{goalTitle}</strong> — {targetValue} {unit} reached.
        That&apos;s not a small thing. You set a goal, you showed up, and you got there.
      </Text>

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>See your goal</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        Take a moment. Then{" "}
        <Link href={`${siteUrl}/dashboard/new`} style={{ color: "#044dfc" }}>
          start your next one
        </Link>{" "}
        if you&apos;re ready.
      </Text>
    </EmailLayout>
  );
}

export default TargetHitEmail;
