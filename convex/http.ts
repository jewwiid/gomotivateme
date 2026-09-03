import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import {
  partnerComplete,
  partnerGoalsCreate,
  partnerGoalsGet,
  partnerMe,
  partnerOptions,
  partnerProgress,
  partnerRegisterInbound,
  partnerToken,
} from "./partnerHttp";
import { githubAppAuthorization, githubAppSetup, githubWebhook } from "./githubHttp";

const http = httpRouter();

const ping = httpAction(async () => {
  return new Response(JSON.stringify({ ok: true, service: "gmm-partner" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({ path: "/partner/ping", method: "GET", handler: ping });

auth.addHttpRoutes(http);
http.route({ path: "/github/app/setup", method: "GET", handler: githubAppSetup });
http.route({ path: "/github/app/authorize", method: "GET", handler: githubAppAuthorization });
http.route({ path: "/github/webhook", method: "POST", handler: githubWebhook });
http.route({ path: "/partner/v1/token", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/me", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/goals", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/progress", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/complete", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/register-inbound", method: "OPTIONS", handler: partnerOptions });
http.route({ path: "/partner/v1/token", method: "POST", handler: partnerToken });
http.route({ path: "/partner/v1/me", method: "GET", handler: partnerMe });
http.route({ path: "/partner/v1/goals", method: "GET", handler: partnerGoalsGet });
http.route({ path: "/partner/v1/goals", method: "POST", handler: partnerGoalsCreate });
http.route({ path: "/partner/v1/progress", method: "POST", handler: partnerProgress });
http.route({ path: "/partner/v1/complete", method: "POST", handler: partnerComplete });
http.route({ path: "/partner/v1/register-inbound", method: "POST", handler: partnerRegisterInbound });

export default http;
