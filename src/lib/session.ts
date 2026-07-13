import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "mci_hr_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is not set");
}
const encodedKey = new TextEncoder().encode(secretKey);

// Kept intentionally small: only what authorization checks need. No email,
// name, or other PII — see the Next.js auth guide's note on session payload
// hygiene. Anything else (display name, etc.) is looked up fresh from the
// database using userId when a page actually needs it.
export type SessionPayload = {
  userId: number;
  employeeId: number;
  roleName: string;
  permissions: string[];
  expiresAt: number; // epoch ms
};

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(encodedKey);
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    // Expired, tampered, or otherwise invalid — treat as no session.
    return null;
  }
}

export async function createSession(
  data: Omit<SessionPayload, "expiresAt">
): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encryptSession({ ...data, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
