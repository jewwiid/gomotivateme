import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface PasswordResetEmailProps {
  email: string;
  /** Magic-link URL with ?code= embedded, provided by Convex Auth. */
  actionUrl: string;
  siteUrl?: string;
}

export function PasswordResetEmail({
  email,
  actionUrl,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preheader="Reset your gomotivateme password.">
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi,
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        We received a request to reset the password for {email}. Click the
        button below to choose a new one.
      </Text>

      <CTAButton href={actionUrl}>Reset password</CTAButton>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "8px 0 0" }}>
        If you didn&apos;t request a password reset, you can safely ignore this
        email. Your password hasn&apos;t been changed.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
