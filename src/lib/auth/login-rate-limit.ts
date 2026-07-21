// Per-account login rate limiting: after MAX_FAILED_LOGIN_ATTEMPTS wrong
// passwords in a row, the account is locked for LOCKOUT_DURATION_MS. A
// correct password always resets the counter — a real employee who
// mistypes once or twice isn't penalized. Deliberately simple (no
// IP-based throttling) — see the login server action for why.

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type LoginAttemptState = {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export function isLockedOut(state: LoginAttemptState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

// Minutes to show the user, rounded up so "14 minutes 1 second left" reads
// as "15 minutes" rather than confusingly as "14".
export function minutesRemaining(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000));
}

export function recordFailedAttempt(
  state: LoginAttemptState,
  now: Date
): LoginAttemptState {
  const failedLoginAttempts = state.failedLoginAttempts + 1;
  const lockedUntil =
    failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
      : state.lockedUntil;
  return { failedLoginAttempts, lockedUntil };
}

export function recordSuccessfulLogin(): LoginAttemptState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
