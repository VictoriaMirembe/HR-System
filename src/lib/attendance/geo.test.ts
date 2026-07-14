import { describe, expect, it } from "vitest";
import { distanceMeters } from "./geo";

describe("distanceMeters", () => {
  it("is zero for identical coordinates", () => {
    const point = { lat: 0.3476, lng: 32.5825 };
    expect(distanceMeters(point, point)).toBeCloseTo(0, 5);
  });

  it("matches a known distance (~1.11km per 0.01 degree latitude)", () => {
    const a = { lat: 0.0, lng: 0.0 };
    const b = { lat: 0.01, lng: 0.0 };
    expect(distanceMeters(a, b)).toBeCloseTo(1113, -1);
  });
});
