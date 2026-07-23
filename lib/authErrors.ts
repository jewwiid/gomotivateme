/**
 * Client-side auth helpers.
 *
 * The Convex HTTP client wraps server errors as opaque "Server Error" strings,
 * stripping the actual message (e.g. "Invalid password", "Account
 * jude@… already exists"). We do a pre-flight check on the client to
 * surface password-length problems cleanly, and translate whatever the
 * server does return into something a user can act on.
 */

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Returns a user-visible error string, or `null` if the password is fine.
 * Use on submit, not on every keystroke — the live hint is in the input.
 */
export function validatePasswordClient(
  password: string
): string | null {
  if (!password) {
    return "Enter a password";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/**
 * Translate a thrown error from `signIn("password", …)` into something
 * a user can act on. The Convex HTTP client often wraps the real message
 * as "[CONVEX M(auth:store)] [ERROR] …" or strips it down to "Server Error";
 * we pattern-match on the substrings that survive.
 *
 * For ConvexError instances we also peek at `err.data` — sometimes the
 * original string is in `data` while `.message` is the wrapped form.
 */
export function translateAuthError(
  err: unknown,
  mode: "signIn" | "signUp"
): string {
  // Pull text from BOTH `.message` and `.data` so we catch the case
  // where the Convex HTTP client swallowed the original message into
  // a generic "Server Error" but kept the real string in `data`.
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  // ConvexError stores the original payload in `.data`. If it's a
  // string, it's usually the same as the message; if it's an object,
  // the message field might be the only useful string. Concat so our
  // substring patterns have the most signal.
  const dataStr =
    err && typeof err === "object" && "data" in err
      ? typeof (err as { data: unknown }).data === "string"
        ? ((err as { data: string }).data ?? "")
        : JSON.stringify((err as { data: unknown }).data ?? "")
      : "";
  const combined = `${message}\n${dataStr}`;
  const lc = combined.toLowerCase();

  // The Password provider's default validator throws "Invalid password"
  // when the length is < 8. The Convex HTTP client usually keeps the
  // error message for the first hop, so this often matches.
  if (lc.includes("invalid password")) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  // @convex-dev/auth throws "InvalidAccountId" when no account exists
  // for the supplied email. This is signIn-only — signup would have
  // created the row. We use a soft nudge to the sign-up flow.
  if (lc.includes("invalidaccountid") || lc.includes("invalid account id")) {
    return mode === "signIn"
      ? "No account with that email. Try creating one — it's free."
      : "Couldn't create your account. Please try again.";
  }

  // @convex-dev/auth throws "InvalidSecret" when the account exists
  // but the password is wrong. We don't differentiate from "Invalid
  // credentials" for security — same user-facing message.
  if (
    lc.includes("invalidsecret") ||
    lc.includes("invalid secret") ||
    lc.includes("invalid credentials") ||
    lc.includes("invalid sign")
  ) {
    return "Wrong email or password.";
  }

  // Verification code errors — invalid, expired, or already used.
  if (
    lc.includes("invalid verification") ||
    lc.includes("expired") ||
    lc.includes("code") && (lc.includes("invalid") || lc.includes("used"))
  ) {
    return "That code is invalid or expired. Request a new one.";
  }

  // "Email verification is not enabled" — shouldn't happen once wired,
  // but handle gracefully.
  if (lc.includes("verification is not enabled")) {
    return "Email verification isn't available right now. Please try again.";
  }

  // Already-exists during signUp. The createAccount helper throws
  // `Account ${account.id} already exists` from the @convex-dev/auth
  // Password provider. We match on the message itself, the
  // `createaccount` function name (in case the message got redacted
  // by Convex's error wrapper), and the data field for the same
  // reason. Either way: tell the user to sign in instead.
  if (
    lc.includes("already exists") ||
    lc.includes("already been registered") ||
    (lc.includes("createaccount") && lc.includes("exists"))
  ) {
    if (mode === "signUp") {
      return "An account with that email already exists. Try signing in.";
    }
    return "That email is already in use.";
  }

  // Missing `password` / `email` flow params — these are dev mistakes,
  // but if they leak through, show a generic message.
  if (lc.includes("missing") && lc.includes("param")) {
    return "Please fill in your email and password.";
  }

  // Convex HTTP client surface — real cause is hidden. Show a friendly
  // generic message instead of the scary bracketed ID.
  if (
    lc.includes("server error") ||
    lc.includes("request id:") ||
    lc.includes("internal server error")
  ) {
    return mode === "signIn"
      ? "Couldn't sign you in. Please try again."
      : "Couldn't create your account. Please try again.";
  }

  // Email format — the server's email validator also wraps. Native
  // input[type=email] catches most of these, but be defensive.
  if (lc.includes("invalid email") || lc.includes("email is invalid")) {
    return "That doesn't look like a valid email address.";
  }

  // Last resort: show the raw message if it looks user-friendly,
  // otherwise a generic fallback. The Convex client usually returns
  // a "Server Error" string in this case.
  if (message && message.length < 200 && !message.startsWith("[")) {
    return message;
  }
  return mode === "signIn"
    ? "Couldn't sign you in. Please try again."
    : "Couldn't create your account. Please try again.";
}
