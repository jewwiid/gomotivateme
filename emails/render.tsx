import * as React from "react";
import { WelcomeEmail, WelcomeEmailProps } from "./welcome";
import { NewApplicationEmail, NewApplicationEmailProps } from "./newApplication";
import { InviteReceivedEmail, InviteReceivedEmailProps } from "./inviteReceived";
import { GoalCreatedEmail, GoalCreatedEmailProps } from "./goalCreated";

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
        subject: "Welcome — let's set up your first goal",
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
        subject: "Your goal is live — let's build momentum",
        component: <GoalCreatedEmail {...p} />,
      };
    }

    default:
      throw new Error(`Unknown email templateId: ${templateId}`);
  }
}
