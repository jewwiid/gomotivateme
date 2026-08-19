import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Rewrite /@handle → /u/handle so profiles have clean, social-style URLs
 * without colliding with existing app routes (/dashboard, /explore, etc.)
 * or Next.js parallel-route folder semantics.
 *
 * The /u/[handle] route stays as the actual handler — this is a transparent
 * rewrite, not a redirect, so the URL bar keeps showing /@handle.
 *
 * Multi-segment paths like /@handle/goals are also rewritten to /u/handle
 * (the profile page shows goals, so the extra segment is dropped).
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host === "gomotivateme.vercel.app") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = "www.gomotivateme.com";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = req.nextUrl;

  // Match /@something with optional /extra-segment(s)
  const match = pathname.match(/^\/@([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (match) {
    const handle = match[1];
    const url = req.nextUrl.clone();
    url.pathname = `/u/${handle}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Run on all paths except static assets. The middleware itself returns
   * early for anything that doesn't match /^\/@handle$/, so non-profile
   * paths pay only a single regex check.
   */
  matcher: ["/((?!_next/static|_next/image|favicon|icon|apple-icon|brand|illustrations|api).*)"],
};
