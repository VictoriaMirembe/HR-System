import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

// Renamed from `middleware.ts` in Next.js 16 (still runs on every matched
// request, same runtime/semantics — just a new file name/convention).
//
// This is an OPTIMISTIC check only: it reads the session cookie and
// redirects, but never touches the database. It exists to keep obviously
// unauthenticated users out of protected pages before any rendering work
// happens. It is NOT the real authorization boundary — every Server
// Component, Server Action, and Route Handler re-verifies the session and
// checks specific permissions itself (see src/lib/dal.ts), because Proxy
// does not run for prefetches/cases that still reach page code, and because
// row-level checks (e.g. "can this manager see this specific employee")
// need real data that isn't safe/cheap to fetch here.
const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/setup/")) return true;
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(cookie);
  const isAuthenticated = !!session && session.expiresAt > Date.now();

  if (!isPublicPath(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
