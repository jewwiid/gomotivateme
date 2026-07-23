import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
// Google is an `@auth/core` generic OAuth provider — that's where the
// shared OAuth abstractions live. `@convex-dev/auth` only ships
// domain-specific providers (Password, Email, Phone, Anonymous) that
// need a custom shape; OAuth providers come from `@auth/core`.
// Required env vars: AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (set on dev
// and prod via `npx convex env set`).
import Google from "@auth/core/providers/google";
import { anyApi } from "convex/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

/**
 * Convex Auth server entry point.
 *
 * The Google provider reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from
 * the Convex environment.
 *
 * Password auth has `verify` and `reset` enabled via Email providers.
 * Convex Auth handles code generation, storage, hashing, expiry, single-use
 * consumption, rate-limiting, and credential rotation server-side. Our
 * `sendVerificationRequest` is purely the email transport — it enqueues a
 * notification row via the existing email pipeline (drained by the cron).
 *
 * The second arg Convex Auth passes to sendVerificationRequest is the
 * action ctx (see @convex-dev/auth signIn.js), so we can call runMutation.
 */

/**
 * Email transport for verification + reset flows. Enqueues a notification
 * row; the drain cron renders + sends via Resend.
 *
 * `provider.id` is "verification" or "reset" depending on which Email
 * config triggered this (Convex Auth sets it from the Password verify/reset
 * wiring). We route to the right template on that basis.
 */
async function sendVerificationRequest(
  params: {
    identifier: string;
    url: string;
    expires: Date;
    provider: { id: string };
    token: string;
    theme?: unknown;
    request?: Request;
  },
  ctx: ActionCtx
) {
  const { identifier, url, provider } = params;
  const isReset = provider.id === "reset" || url.includes("reset");
  const templateId = isReset ? "passwordReset" : "emailVerification";

  // Look up the user by email to pass the userId (for unsubscribe token
  // injection). For signup verification the user may not exist yet, which
  // is fine — the email renders the "service message" footer.
  const user = await ctx.runQuery(anyApi.users.getRawByEmail, { email: identifier });

  await ctx.runMutation(internal.emails.enqueue, {
    userId: user?._id,
    toEmail: identifier,
    templateId,
    category: "transactional",
    payload: JSON.stringify({ email: identifier, actionUrl: url }),
  });
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: Email({
        sendVerificationRequest: sendVerificationRequest as any,
      }),
      reset: Email({
        sendVerificationRequest: sendVerificationRequest as any,
      }),
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});
