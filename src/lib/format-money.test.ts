import { describe, expect, it } from "vitest";
import { formatMoney } from "./format-money";

describe("formatMoney", () => {
  it("adds thousands separators and drops decimals", () => {
    expect(formatMoney(1500000)).toBe("1,500,000");
  });

  it("rounds fractional shillings", () => {
    expect(formatMoney(1234.7)).toBe("1,235");
  });

  it("accepts string input (e.g. Prisma Decimal.toString())", () => {
    expect(formatMoney("999")).toBe("999");
  });

  it("handles zero and negative amounts", () => {
    expect(formatMoney(0)).toBe("0");
    expect(formatMoney(-500)).toBe("-500");
  });
});
