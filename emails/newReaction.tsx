import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, CTAButton } from "./components/Layout";

export interface NewReactionEmailProps {
  ownerName: string;
  goalTitle: string;
  goalSlug: string;
  /** Which emoji was reacted with, e.g. "👍", "💪", "❤️", "🔥" */
  emojiLabel: string;
  /** "goal" or "update" — where the reaction was left */
  targetType: "goal" | "update";
  /** Total reactions on this goal so far, for social proof */
  totalReactions: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function NewReactionEmail({
  ownerName,
  goalTitle,
  goalSlug,
  emojiLabel,
  targetType,
  totalReactions,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: NewReactionEmailProps) {
  return (
    <EmailLayout
      preheader={`Someone left a ${emojiLabel} on ${goalTitle}.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {ownerName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Someone just left a <strong>{emojiLabel}</strong> on{" "}
        <strong>{goalTitle}</strong>.
      </Text>

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "0 0 24px" }}>
        {totalReactions === 1
          ? "That's your first cheer."
          : `That's ${totalReactions} cheers now. People are rooting for you.`}
      </Text>

      <CTAButton href={`${siteUrl}/o/${goalSlug}`}>See your goal</CTAButton>
    </EmailLayout>
  );
}

export default NewReactionEmail;