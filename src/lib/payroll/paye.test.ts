import { describe, expect, it } from "vitest";
import { calculatePaye } from "./paye";

describe("calculatePaye", () => {
  it("is zero within the tax-free band", () => {
    expect(calculatePaye(0)).toBe(0);
    expect(calculatePaye(235_000)).toBe(0);
  });

  it("taxes only the portion above 235,000 at 10% up to 335,000", () => {
    expect(calculatePaye(335_000)).toBe(10_000); // (335,000-235,000) * 0.10
  });

  it("taxes the portion above 335,000 at 20% up to 410,000", () => {
    expect(calculatePaye(410_000)).toBe(25_000); // 10,000 + (410,000-335,000) * 0.20
  });

  it("taxes everything above 410,000 at 30%, marginally", () => {
    expect(calculatePaye(1_000_000)).toBe(202_000); // 25,000 + (1,000,000-410,000) * 0.30
  });

  it("never taxes the same shilling at two different rates", () => {
    // 335,000 is the top of the 10% band; one shilling more crosses into
    // the 20% band. Only that one shilling should be taxed at the new
    // rate — the marginal calculation, not the whole income retroactively
    // taxed at the higher rate.
    const atBandTop = calculatePaye(335_000);
    const oneOver = calculatePaye(335_001);
    expect(oneOver - atBandTop).toBeCloseTo(0.2, 5); // 1 shilling at 20%
  });
});
