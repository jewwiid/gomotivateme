import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface ApplicationDecisionEmailProps {
  applicantName: string;
  goalTitle: string;
  goalSlug: string;
  /** "approved" | "declined" */
  decision: string;
  roleLabel: string;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function ApplicationDecisionEmail({
  applicantName,
  goalTitle,
  goalSlug,
  decision,
  roleLabel,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: ApplicationDecisionEmailProps) {
  const approved = decision === "approved";

  return (
    <EmailLayout
      preheader={approved ? `You're in. ${goalTitle}.` : `Update on ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {applicantName},
      </Text>
      {approved ? (
        <>
          <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
            Great news. You&apos;ve been approved as a <strong>{roleLabel}</strong> on{" "}
            <strong>{goalTitle}</strong>. They wanted you on their team, and now you&apos;re in.
          </Text>
          <CTAButton href={`${siteUrl}/o/${goalSlug}`}>See the goal</CTAButton>
        </>
      ) : (
        <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
          An update on your application to be a <strong>{roleLabel}</strong> on{" "}
          <strong>{goalTitle}</strong>: it wasn&apos;t accepted this time. No reflection on
          you. Sometimes the timing or fit just isn&apos;t right.
        </Text>
      )}
      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        There are always more goals to get behind.
      </Text>
    </EmailLayout>
  );
}

export default ApplicationDecisionEmail;
