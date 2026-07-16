import { describe, expect, it } from "vitest";
import { describeActionLabel, describeAuditEntry } from "./describe";

describe("describeActionLabel", () => {
  it("returns the friendly label for a known action", () => {
    expect(describeActionLabel("employee.create")).toBe("Employee created");
    expect(describeActionLabel("leave.approve_final")).toBe("Leave approved (HR)");
  });

  it("falls back to a humanized version of an unknown action", () => {
    expect(describeActionLabel("widget.frobnicate")).toBe("Widget frobnicate");
  });
});

describe("describeAuditEntry", () => {
  it("describes an employee creation with its employee ID", () => {
    expect(describeAuditEntry("employee.create", { employeeId: "MCI-2026-0001" })).toBe(
      "Employee ID MCI-2026-0001."
    );
  });

  it("lists changed fields for a self-update", () => {
    expect(
      describeAuditEntry("employee.self_update", { fields: ["mobile", "personalEmail"] })
    ).toBe("Employee updated their own: mobile, personalEmail.");
  });

  it("includes the reason for a decline", () => {
    expect(describeAuditEntry("leave.decline_final", { reason: "Insufficient coverage" })).toBe(
      "Declined by HR. Reason: Insufficient coverage."
    );
  });

  it("flags a late clock-in", () => {
    expect(describeAuditEntry("attendance.clock_in", { method: "GEOFENCE", isLate: true })).toBe(
      "Method: GEOFENCE. Flagged late."
    );
  });

  it("falls back to raw JSON for an unrecognized action with metadata", () => {
    expect(describeAuditEntry("something.new", { foo: "bar" })).toBe('{"foo":"bar"}');
  });

  it("falls back to a plain message when there is no metadata at all", () => {
    expect(describeAuditEntry("auth.login", null)).toBe("Logged into the system.");
    expect(describeAuditEntry("something.new", null)).toBe("No further detail recorded.");
  });
});
