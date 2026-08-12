import * as React from "react";
import { WelcomeEmail, WelcomeEmailProps } from "./welcome";
import { NewApplicationEmail, NewApplicationEmailProps } from "./newApplication";
import { InviteReceivedEmail, InviteReceivedEmailProps } from "./inviteReceived";
import { GoalCreatedEmail, GoalCreatedEmailProps } from "./goalCreated";
import { ApplicationDecisionEmail, ApplicationDecisionEmailProps } from "./applicationDecision";
import { SupportMessageReceivedEmail, SupportMessageReceivedEmailProps } from "./supportMessageReceived";
import { NewUpdateEmail, NewUpdateEmailProps } from "./newUpdate";
import { TargetHitEmail, TargetHitEmailProps } from "./targetHit";
import { EmailVerificationEmail, EmailVerificationEmailProps } from "./emailVerification";
import { PasswordResetEmail, PasswordResetEmailProps } from "./passwordReset";
import { WeeklyDigestEmail, WeeklyDigestEmailProps } from "./weeklyDigest";
import { CheckInDueEmail, CheckInDueEmailProps } from "./checkInDue";
import { NewReactionEmail, NewReactionEmailProps } from "./newReaction";
import { StaleGoalEmail, StaleGoalEmailProps } from "./staleGoal";
import { DeadlineApproachingEmail, DeadlineApproachingEmailProps } from "./deadlineApproaching";
import { DeadlinePassedEmail, DeadlinePassedEmailProps } from "./deadlinePassed";
import { StreakReminderEmail, StreakReminderEmailProps } from "./streakReminder";
import { FollowRequestEmail, FollowRequestEmailProps } from "./followRequest";
import { NewFollowerEmail, NewFollowerEmailProps } from "./newFollower";
import { PlatformDigestEmail, PlatformDigestEmailProps } from "./platformDigest";

/**
 * Map a templateId + payload to a { subject, component } pair.
 *
 * This runs inside the Convex `drainQueue` action (Node runtime). Each case
 * casts the JSON payload to the template's props — the shape is owned by the
 * enqueue call site and matches the template's interface.
 */
export function renderTemplate(
  templateId: string,
  payload: Record<string, any>
): { subject: string; component: React.ReactElement } {
  switch (templateId) {
    case "welcome": {
      const p = payload as WelcomeEmailProps;
      return {
        subject: "Welcome. Let's set up your first goal",
        component: <WelcomeEmail {...p} />,
      };
    }

    case "newApplication": {
      const p = payload as NewApplicationEmailProps;
      return {
        subject: `${p.motivatorName} wants to support your ${p.goalTitle}`,
        component: <NewApplicationEmail {...p} />,
      };
    }

    case "inviteReceived": {
      const p = payload as InviteReceivedEmailProps;
      return {
        subject: `${p.ownerName} wants you on their team`,
        component: <InviteReceivedEmail {...p} />,
      };
    }

    case "goalCreated": {
      const p = payload as GoalCreatedEmailProps;
      return {
        subject: "Your goal is live",
        component: <GoalCreatedEmail {...p} />,
      };
    }

    case "applicationDecision": {
      const p = payload as ApplicationDecisionEmailProps;
      return {
        subject:
          p.decision === "approved"
            ? `You're approved for ${p.goalTitle}`
            : `Update on your ${p.goalTitle} application`,
        component: <ApplicationDecisionEmail {...p} />,
      };
    }

    case "supportMessageReceived": {
      const p = payload as SupportMessageReceivedEmailProps;
      return {
        subject: `${p.authorName} sent you ${p.supportTypeLabel}`,
        component: <SupportMessageReceivedEmail {...p} />,
      };
    }

    case "newUpdate": {
      const p = payload as NewUpdateEmailProps;
      return {
        subject: `${p.ownerName} posted an update on ${p.goalTitle}`,
        component: <NewUpdateEmail {...p} />,
      };
    }

    case "targetHit": {
      const p = payload as TargetHitEmailProps;
      return {
        subject: `You did it. ${p.goalTitle} is complete`,
        component: <TargetHitEmail {...p} />,
      };
    }

    case "emailVerification": {
      const p = payload as EmailVerificationEmailProps;
      return {
        subject: "Verify your email",
        component: <EmailVerificationEmail {...p} />,
      };
    }

    case "passwordReset": {
      const p = payload as PasswordResetEmailProps;
      return {
        subject: "Reset your password",
        component: <PasswordResetEmail {...p} />,
      };
    }

    case "weeklyDigest": {
      const p = payload as WeeklyDigestEmailProps;
      return {
        subject: "Your week on gomotivateme",
        component: <WeeklyDigestEmail {...p} />,
      };
    }

    case "platformDigest": {
      const p = payload as PlatformDigestEmailProps;
      return {
        subject:
          p.cadence === "daily"
            ? "Fresh goals worth cheering today"
            : "This week's new goals on GoMotivateMe",
        component: <PlatformDigestEmail {...p} />,
      };
    }

    case "checkInDue": {
      const p = payload as CheckInDueEmailProps;
      return {
        subject: `${p.ownerName}'s check-in is due`,
        component: <CheckInDueEmail {...p} />,
      };
    }

    case "streakReminder": {
      const p = payload as StreakReminderEmailProps;
      return {
        subject: `Keep your ${p.goalTitle} streak alive`,
        component: <StreakReminderEmail {...p} />,
      };
    }

    case "followRequest": {
      const p = payload as FollowRequestEmailProps;
      return {
        subject: `${p.followerName} asked to follow you`,
        component: <FollowRequestEmail {...p} />,
      };
    }

    case "newFollower": {
      const p = payload as NewFollowerEmailProps;
      return {
        subject: `${p.followerName} is now following you`,
        component: <NewFollowerEmail {...p} />,
      };
    }

    case "newReaction": {
      const p = payload as NewReactionEmailProps;
      return {
        subject: `Someone cheered your ${p.goalTitle} ${p.emojiLabel}`,
        component: <NewReactionEmail {...p} />,
      };
    }

    case "staleGoal": {
      const p = payload as StaleGoalEmailProps;
      return {
        subject: `${p.daysSinceLastUpdate} days since you updated ${p.goalTitle}`,
        component: <StaleGoalEmail {...p} />,
      };
    }

    case "goalUpdateReminder": {
      const p = payload as StaleGoalEmailProps;
      return {
        subject: `Time for an update on ${p.goalTitle}`,
        component: <StaleGoalEmail {...p} />,
      };
    }

    case "deadlineApproaching": {
      const p = payload as DeadlineApproachingEmailProps;
      return {
        subject: `${p.daysRemaining} day${p.daysRemaining === 1 ? "" : "s"} left on ${p.goalTitle}`,
        component: <DeadlineApproachingEmail {...p} />,
      };
    }

    case "deadlinePassed": {
      const p = payload as DeadlinePassedEmailProps;
      return {
        subject: `Your ${p.goalTitle} deadline passed`,
        component: <DeadlinePassedEmail {...p} />,
      };
    }

    default:
      throw new Error(`Unknown email templateId: ${templateId}`);
  }
}
