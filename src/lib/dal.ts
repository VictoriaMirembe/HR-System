import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decryptSession, getSessionToken } from "@/lib/session";
import type { SessionPayload } from "@/lib/session";

// React's cache() memoizes this per request: no matter how many server
// components/route handlers call verifySession() while rendering one page,
// the cookie is only decrypted once. This is the single choke point all
// authorization in the app flows through.
export const verifySession = cache(
  async (): Promise<SessionPayload> => {
    const token = await getSessionToken();
    const session = await decryptSession(token);

    if (!session || session.expiresAt < Date.now()) {
      redirect("/login");
    }

    return session;
  }
);

// Same as verifySession but returns null instead of redirecting — for
// places (e.g. the login page itself) that need to know "is someone already
// logged in" without forcing a redirect loop.
export const getOptionalSession = cache(
  async (): Promise<SessionPayload | null> => {
    const token = await getSessionToken();
    const session = await decryptSession(token);
    if (!session || session.expiresAt < Date.now()) return null;
    return session;
  }
);
