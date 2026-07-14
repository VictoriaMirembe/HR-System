import { describe, expect, it } from "vitest";
import { hasPermission, requirePermission, ForbiddenError } from "./check";
import { PERMISSIONS } from "./permissions";

describe("hasPermission", () => {
  it("returns true when the permission is present", () => {
    const session = { permissions: [PERMISSIONS.EMPLOYEE_CREATE] };
    expect(hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE)).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    const session = { permissions: [PERMISSIONS.EMPLOYEE_READ] };
    expect(hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE)).toBe(false);
  });

  it("returns false for a null session", () => {
    expect(hasPermission(null, PERMISSIONS.EMPLOYEE_READ)).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when the permission is present", () => {
    const session = { permissions: [PERMISSIONS.AUDIT_READ] };
    expect(() =>
      requirePermission(session, PERMISSIONS.AUDIT_READ)
    ).not.toThrow();
  });

  it("throws ForbiddenError when the permission is absent", () => {
    const session = { permissions: [] };
    expect(() => requirePermission(session, PERMISSIONS.AUDIT_READ)).toThrow(
      ForbiddenError
    );
  });
});
