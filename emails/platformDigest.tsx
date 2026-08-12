import * as React from "react";
import { Hr, Link, Section, Text } from "@react-email/components";
import { CTAButton, EmailLayout } from "./components/Layout";

export interface PlatformDigestGoal {
  title: string;
  summary: string;
  category: string;
  slug: string;
  ownerHandle: string;
  ownerName: string;
  supporterCount: number;
  progressPct: number;
}

export interface PlatformDigestEmailProps {
  firstName?: string;
  cadence: "daily" | "weekly";
  goals: PlatformDigestGoal[];
  totalNewGoals: number;
  siteUrl?: string;
  unsubscribeToken?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  learning: "Learning",
  career: "Career & money",
  launch: "Product launch",
  creative: "Creative project",
  habit: "Habit & streak",
  sports: "Sports & event",
  community: "Community",
  personal: "Personal milestone",
  travel: "Travel & adventure",
  family: "Family & kids",
  faith: "Faith & spiritual",
  other: "Other",
};

export function PlatformDigestEmail({
  firstName,
  cadence,
  goals,
  totalNewGoals,
  siteUrl = "https://www.gomotivateme.com",
  unsubscribeToken,
}: PlatformDigestEmailProps) {
  const frequencyLabel = cadence === "daily" ? "daily" : "weekly";
  const intro =
    cadence === "daily"
      ? "A few fresh goals are looking for their first bit of encouragement."
      : "Here are some of the most promising new goals shared this week.";

  return (
    <EmailLayout
      preheader={`${goals.length} new goals worth cheering on GoMotivateMe.`}
      unsubscribeUrl={
        unsubscribeToken
          ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}`
          : undefined
      }
      footerNote={`You chose the ${frequencyLabel} Discover email in your GoMotivateMe settings.`}
    >
      <Text style={bodyText}>{firstName ? `Hi ${firstName},` : "Hi there,"}</Text>
      <Text style={bodyText}>{intro}</Text>
      {totalNewGoals > goals.length && (
        <Text style={mutedText}>
          {totalNewGoals} eligible new goal{totalNewGoals === 1 ? "" : "s"} arrived in this
          {cadence === "daily" ? " edition" : " week's roundup"}. These are a few to start with.
        </Text>
      )}

      <Section style={{ margin: "24px 0 8px" }}>
        {goals.map((goal, index) => (
          <React.Fragment key={`${goal.ownerHandle}/${goal.slug}`}>
            {index > 0 && <Hr style={{ borderColor: "#e4e4dc", margin: "20px 0" }} />}
            <Text style={eyebrow}>{CATEGORY_LABELS[goal.category] ?? "New goal"}</Text>
            <Text style={goalTitle}>
              <Link
                href={`${siteUrl}/o/${goal.ownerHandle}/${goal.slug}`}
                style={{ color: "#202124", textDecoration: "none" }}
              >
                {goal.title}
              </Link>
            </Text>
            <Text style={summary}>{goal.summary}</Text>
            <Text style={metadata}>
              By {goal.ownerName} · {Math.round(goal.progressPct)}% complete
              {goal.supporterCount > 0
                ? ` · ${goal.supporterCount} supporter${goal.supporterCount === 1 ? "" : "s"}`
                : " · Be their first supporter"}
            </Text>
            <Link
              href={`${siteUrl}/o/${goal.ownerHandle}/${goal.slug}`}
              style={{ color: "#044dfc", fontSize: "14px", fontWeight: 700 }}
            >
              See the goal →
            </Link>
          </React.Fragment>
        ))}
      </Section>

      <CTAButton href={`${siteUrl}/explore`}>Explore more goals</CTAButton>
      <Text style={{ ...mutedText, textAlign: "center" }}>
        Want fewer emails? Change Discover to weekly or off in your email preferences.
      </Text>
    </EmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#202124",
  margin: "0 0 16px",
};
const mutedText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#6c706f",
  margin: "0 0 16px",
};
const eyebrow: React.CSSProperties = {
  color: "#044dfc",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: "0 0 5px",
  textTransform: "uppercase",
};
const goalTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: "1.35",
  margin: "0 0 7px",
};
const summary: React.CSSProperties = {
  color: "#404443",
  fontSize: "15px",
  lineHeight: "1.55",
  margin: "0 0 8px",
};
const metadata: React.CSSProperties = {
  color: "#6c706f",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

export default PlatformDigestEmail;
