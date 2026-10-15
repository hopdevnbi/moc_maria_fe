import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isEventRootRequest } from "./shared/config/event-host";

/**
 * Next 16 proxy executes before route resolution; host-based rewrites in
 * next.config.ts alone are not reliable on every Vercel custom-domain setup.
 * Limit to / and only the custom Event hostname; all other site behavior remains unchanged.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || request.nextUrl.host;
  if (!isEventRootRequest(host, request.nextUrl.pathname)) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = "/event";
  return NextResponse.rewrite(destination);
}

export const config = { matcher: ["/"] };
