import { describe, expect, it } from "vitest";
import {
  isLockedOut,
  minutesRemaining,
  recordFailedAttempt,
  recordSuccessfulLogin,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "./login-rate-limit";

describe("isLockedOut", () => {
  it("is false when lockedUntil is null", () => {
    expect(isLockedOut({ failedLoginAttempts: 3, lockedUntil: null }, new Date())).toBe(false);
  });

  it("is true when lockedUntil is in the future", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const lockedUntil = new Date("2026-01-01T12:10:00Z");
    expect(isLockedOut({ failedLoginAttempts: 5, lockedUntil }, now)).toBe(true);
  });

  it("is false once lockedUntil has passed", () => {
    const now = new Date("2026-01-01T12:20:00Z");
    const lockedUntil = new Date("2026-01-01T12:10:00Z");
    expect(isLockedOut({ failedLoginAttempts: 5, lockedUntil }, now)).toBe(false);
  });
});

describe("recordFailedAttempt", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("increments the counter without locking below the threshold", () => {
    const result = recordFailedAttempt({ failedLoginAttempts: 1, lockedUntil: null }, now);
    expect(result.failedLoginAttempts).toBe(2);
    expect(result.lockedUntil).toBeNull();
  });

  it("locks the account on reaching the threshold", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1, lockedUntil: null },
      now
    );
    expect(result.failedLoginAttempts).toBe(MAX_FAILED_LOGIN_ATTEMPTS);
    expect(result.lockedUntil).not.toBeNull();
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("recordSuccessfulLogin", () => {
  it("resets the counter and clears the lock", () => {
    expect(recordSuccessfulLogin()).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });
});

describe("minutesRemaining", () => {
  it("rounds up to the nearest minute", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const lockedUntil = new Date("2026-01-01T12:00:30Z"); // 30 seconds left
    expect(minutesRemaining(lockedUntil, now)).toBe(1);
  });

  it("never returns less than 1", () => {
    const now = new Date("2026-01-01T12:00:05Z");
    const lockedUntil = new Date("2026-01-01T12:00:00Z"); // already past, clock skew edge case
    expect(minutesRemaining(lockedUntil, now)).toBe(1);
  });
});
