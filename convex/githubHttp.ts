import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { publicSiteUrl } from "./partnerCrypto";

function redirect(path: string) {
  return Response.redirect(`${publicSiteUrl()}${path}`, 302);
}

function resumePath(returnTo: string | undefined, github: string) {
  const safePath = returnTo?.startsWith("/dashboard/") ? returnTo : "/settings?tab=integrations";
  return `${safePath}${safePath.includes("?") ? "&" : "?"}github=${encodeURIComponent(github)}`;
}

export const githubAppSetup = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const installationId = url.searchParams.get("installation_id");
  if (error || !state || !installationId) return redirect(`/settings?tab=integrations&github=${encodeURIComponent(error || "cancelled")}`);
  try {
    const result = await ctx.runAction(internal.github.finalizeAppInstallation, { state, installationId });
    return redirect(resumePath(result.returnTo, "connected"));
  } catch (callbackError) {
    console.error("[github] App setup failed", callbackError);
    return redirect("/settings?tab=integrations&github=failed");
  }
});

export const githubAppAuthorization = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (error || !state || !code) {
    return redirect(`/settings?tab=integrations&github=${encodeURIComponent(error || "cancelled")}`);
  }
  try {
    const result = await ctx.runAction(internal.github.finalizeAppAuthorization, { state, code });
    if (result.outcome === "install" && result.installUrl) return Response.redirect(result.installUrl, 302);
    return redirect(resumePath(result.returnTo, result.outcome === "choose" ? "choose-installation" : "connected"));
  } catch (callbackError) {
    console.error("[github] User authorization failed", callbackError);
    return redirect("/settings?tab=integrations&github=failed");
  }
});

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function hasValidWebhookSignature(body: string, signature: string | null) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return timingSafeEqual(`sha256=${hex(new Uint8Array(digest))}`, signature);
}

export const githubWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  if (!(await hasValidWebhookSignature(body, request.headers.get("x-hub-signature-256")))) {
    return new Response("Invalid GitHub webhook signature", { status: 401 });
  }
  const event = request.headers.get("x-github-event") || "";
  if (!event) return new Response("Missing GitHub event", { status: 400 });
  try {
    await ctx.runAction(internal.github.handleWebhook, { event, payload: JSON.parse(body) });
  } catch (error) {
    console.error("[github] webhook handling failed", error);
    return new Response("GitHub webhook handling failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
