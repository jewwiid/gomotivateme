import * as React from "react";
import { Text } from "@react-email/components";
import { CTAButton, EmailLayout } from "./components/Layout";

export interface StreakReminderEmailProps {
  ownerName: string;
  goalTitle: string;
  goalId: string;
  currentStreak: number;
  bestStreak: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function StreakReminderEmail({
  ownerName,
  goalTitle,
  goalId,
  currentStreak,
  bestStreak,
  siteUrl = "https://www.gomotivateme.com",
  unsubscribeToken,
}: StreakReminderEmailProps) {
  const firstName = ownerName?.split(" ")[0] || "there";
  return (
    <EmailLayout
      preheader={`One quick check-in keeps your ${goalTitle} streak moving.`}
      unsubscribeUrl={
        unsubscribeToken
          ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}`
          : undefined
      }
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Today is still open on <strong>{goalTitle}</strong>. Your current streak is{" "}
        <strong>{currentStreak} day{currentStreak === 1 ? "" : "s"}</strong>
        {bestStreak > currentStreak ? `, with a best of ${bestStreak}` : ""}.
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        Do the smallest version that counts, then mark the day. Consistency beats a perfect session.
      </Text>
      <CTAButton href={`${siteUrl}/dashboard/${goalId}`}>Mark today</CTAButton>
    </EmailLayout>
  );
}

export default StreakReminderEmail;
