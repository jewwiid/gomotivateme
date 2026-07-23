import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface EmailVerificationEmailProps {
  email: string;
  /** Magic-link URL with ?code= embedded, provided by Convex Auth. */
  actionUrl: string;
  siteUrl?: string;
}

export function EmailVerificationEmail({
  email,
  actionUrl,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout preheader="Confirm your email to get started.">
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi,
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Confirm your email address ({email}) to finish setting up your
        gomotivateme account.
      </Text>

      <CTAButton href={actionUrl}>Verify email</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        If you didn&apos;t create an account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default EmailVerificationEmail;
