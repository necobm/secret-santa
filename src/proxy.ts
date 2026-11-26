import { NextResponse, type NextRequest } from "next/server";

// Optimistic check: without a session cookie there is nothing to see in the Organizer area.
// The real check (valid session in the DB) is in requireOrganizer() and in every Server Action.
// The cookie name must match SESSION_COOKIE in src/accounts/session.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/draws/:path*"],
};
