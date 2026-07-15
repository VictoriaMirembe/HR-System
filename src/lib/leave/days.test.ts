import { describe, expect, it } from "vitest";
import { countLeaveDays } from "./days";

describe("countLeaveDays", () => {
  it("counts a single day as 1", () => {
    expect(countLeaveDays(new Date(2026, 0, 5), new Date(2026, 0, 5))).toBe(1);
  });

  it("counts inclusively across multiple days", () => {
    // Mon Jan 5 to Wed Jan 7 = 3 days
    expect(countLeaveDays(new Date(2026, 0, 5), new Date(2026, 0, 7))).toBe(3);
  });

  it("ignores time-of-day components", () => {
    const start = new Date(2026, 0, 5, 23, 59);
    const end = new Date(2026, 0, 6, 0, 1);
    expect(countLeaveDays(start, end)).toBe(2);
  });
});
