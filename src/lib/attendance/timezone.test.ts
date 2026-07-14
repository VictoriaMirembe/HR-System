import { describe, expect, it } from "vitest";
import { getTimeInTimeZone, startOfDayInTimeZone } from "./timezone";

describe("getTimeInTimeZone", () => {
  it("converts a UTC instant to Kampala local time (UTC+3)", () => {
    expect(getTimeInTimeZone(new Date("2026-01-01T05:10:00Z"), "Africa/Kampala")).toEqual(
      { hours: 8, minutes: 10 }
    );
  });
});

describe("startOfDayInTimeZone", () => {
  it("returns Kampala midnight as its UTC instant (21:00 UTC the prior day)", () => {
    // 2026-01-01 00:00 Kampala = 2025-12-31 21:00 UTC (Kampala is UTC+3).
    const result = startOfDayInTimeZone(
      new Date("2026-01-01T05:10:00Z"),
      "Africa/Kampala"
    );
    expect(result.toISOString()).toBe("2025-12-31T21:00:00.000Z");
  });

  it("stays on the same Kampala calendar day for a late-evening instant", () => {
    // 2026-01-01 23:30 Kampala = 2026-01-01 20:30 UTC — still Jan 1 in
    // Kampala, so start-of-day should still be Dec 31 21:00 UTC.
    const result = startOfDayInTimeZone(
      new Date("2026-01-01T20:30:00Z"),
      "Africa/Kampala"
    );
    expect(result.toISOString()).toBe("2025-12-31T21:00:00.000Z");
  });
});
