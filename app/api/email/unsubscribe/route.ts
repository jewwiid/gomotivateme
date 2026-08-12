import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

/** RFC 8058 one-click unsubscribe endpoint used by Gmail and Yahoo. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!token || !convexUrl) {
    return new Response(null, { status: token ? 503 : 400 });
  }

  const client = new ConvexHttpClient(convexUrl);
  await client.mutation(api.notificationPrefs.unsubscribeByToken, { token });
  return new Response(null, { status: 200 });
}
