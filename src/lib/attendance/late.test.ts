import { describe, expect, it } from "vitest";
import { isLateClockIn } from "./late";

// Workday starts 08:00 Africa/Kampala time (UTC+3, no daylight saving) with
// a 10-minute grace period — late cutoff is 08:10 Kampala = 05:10 UTC.
// Dates are written as explicit UTC instants (not `new Date(y, m, d, h, min)`,
// which uses the TEST RUNNER's local time zone) so this test is
// deterministic regardless of what machine/CI it runs on.
describe("isLateClockIn", () => {
  it("is not late exactly at the cutoff", () => {
    expect(isLateClockIn(new Date("2026-01-01T05:10:00Z"))).toBe(false);
  });

  it("is not late well before the cutoff", () => {
    expect(isLateClockIn(new Date("2026-01-01T04:45:00Z"))).toBe(false);
  });

  it("is late one minute after the cutoff", () => {
    expect(isLateClockIn(new Date("2026-01-01T05:11:00Z"))).toBe(true);
  });

  it("is late well after the cutoff", () => {
    expect(isLateClockIn(new Date("2026-01-01T08:00:00Z"))).toBe(true);
  });

  it("judges lateness in Kampala time regardless of the server's own time zone", () => {
    // 07:59 Kampala = 04:59 UTC — one minute before the 08:00 workday
    // start, so still within the grace period either way this is read.
    expect(isLateClockIn(new Date("2026-01-01T04:59:00Z"))).toBe(false);
  });
});
