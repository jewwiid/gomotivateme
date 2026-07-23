import * as React from "react";
import { Text, Link, Hr } from "@react-email/components";
import { EmailLayout } from "./components/Layout";

export interface DigestGoal {
  title: string;
  slug: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  progressPct: number;
  progressType: string;
  updates: number;
  messages: number;
  checkIns: number;
  newSupporters: number;
}

export interface WeeklyDigestEmailProps {
  firstName?: string;
  goals: DigestGoal[];
  siteUrl?: string;
  unsubscribeToken?: string;
}

export function WeeklyDigestEmail({
  firstName,
  goals,
  siteUrl = "https://gomotivateme.com",
  unsubscribeToken,
}: WeeklyDigestEmailProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Hi there";
  const totalActivity = goals.reduce(
    (sum, g) => sum + g.updates + g.messages + g.checkIns + g.newSupporters,
    0
  );

  return (
    <EmailLayout
      preheader={`Your week: ${totalActivity} updates.`}
      unsubscribeUrl={unsubscribeToken ? `${siteUrl}/email/unsubscribe?token=${unsubscribeToken}` : undefined}
    >
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 16px" }}>
        {greeting},
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#202124", margin: "0 0 24px" }}>
        Here&apos;s what happened across your goals this week.
      </Text>

      {goals.map((goal, i) => {
        const valueLabel =
          goal.progressType === "milestones"
            ? `${goal.currentValue} / ${goal.targetValue} milestones`
            : `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`;

        const bits: string[] = [];
        if (goal.updates > 0) bits.push(`${goal.updates} update${goal.updates > 1 ? "s" : ""}`);
        if (goal.newSupporters > 0) bits.push(`${goal.newSupporters} new supporter${goal.newSupporters > 1 ? "s" : ""}`);
        if (goal.messages > 0) bits.push(`${goal.messages} message${goal.messages > 1 ? "s" : ""}`);
        if (goal.checkIns > 0) bits.push(`${goal.checkIns} check-in${goal.checkIns > 1 ? "s" : ""}`);

        return (
          <React.Fragment key={goal.slug}>
            {i > 0 && <Hr style={{ borderColor: "#e4e4dc", margin: "20px 0" }} />}
            <Text style={{ fontSize: "15px", fontWeight: 700, color: "#202124", margin: "0 0 4px" }}>
              <Link href={`${siteUrl}/o/${goal.slug}`} style={{ color: "#044dfc", textDecoration: "none" }}>
                {goal.title}
              </Link>
            </Text>
            <Text style={{ fontSize: "13px", color: "#6c706f", margin: "0 0 8px" }}>
              {valueLabel} · {Math.round(goal.progressPct)}% there
            </Text>
            {/* Progress bar */}
            <div style={{ width: "100%", height: "6px", backgroundColor: "#f0efe9", borderRadius: "3px", margin: "0 0 8px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(2, goal.progressPct))}%`,
                  height: "100%",
                  backgroundColor: "#044dfc",
                  borderRadius: "3px",
                }}
              />
            </div>
            {bits.length > 0 && (
              <Text style={{ fontSize: "13px", color: "#6c706f", margin: "0" }}>
                {bits.join(" · ")}
              </Text>
            )}
          </React.Fragment>
        );
      })}

      <Text style={{ fontSize: "15px", color: "#6c706f", margin: "24px 0 0", textAlign: "center" }}>
        Keep going.
      </Text>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;
