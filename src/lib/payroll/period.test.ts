import { describe, expect, it } from "vitest";
import { getPeriodBounds, isValidPeriod } from "./period";

describe("isValidPeriod", () => {
  it("accepts valid YYYY-MM strings", () => {
    expect(isValidPeriod("2026-07")).toBe(true);
    expect(isValidPeriod("2026-01")).toBe(true);
    expect(isValidPeriod("2026-12")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidPeriod("2026-7")).toBe(false);
    expect(isValidPeriod("2026-13")).toBe(false);
    expect(isValidPeriod("2026-00")).toBe(false);
    expect(isValidPeriod("July 2026")).toBe(false);
    expect(isValidPeriod("")).toBe(false);
  });
});

describe("getPeriodBounds", () => {
  it("spans exactly one calendar month in Kampala time", () => {
    const { start, end } = getPeriodBounds("2026-07");
    // 2026-07-01 00:00 Kampala = 2026-06-30 21:00 UTC (Kampala is UTC+3).
    expect(start.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    // 2026-08-01 00:00 Kampala = 2026-07-31 21:00 UTC.
    expect(end.toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  it("rolls over correctly at a year boundary", () => {
    const { start, end } = getPeriodBounds("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T21:00:00.000Z");
  });
});
