import { startOfDayInTimeZone } from "@/lib/attendance/timezone";
import { ORG_TIMEZONE } from "@/lib/attendance/config";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_PATTERN.test(period);
}

// [start, end) in ORG_TIMEZONE — end is exclusive (midnight on the 1st of
// the following month), matching the pattern already used for attendance's
// "today" boundary (see src/lib/attendance/timezone.ts). Assumes `period`
// has already been validated with isValidPeriod.
export function getPeriodBounds(period: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  // Noon UTC comfortably avoids landing on the wrong calendar day in
  // ORG_TIMEZONE for any realistic UTC offset before startOfDayInTimeZone
  // resolves it to the correct local midnight.
  const start = startOfDayInTimeZone(new Date(Date.UTC(year, month - 1, 1, 12)), ORG_TIMEZONE);
  const end = startOfDayInTimeZone(new Date(Date.UTC(year, month, 1, 12)), ORG_TIMEZONE);

  return { start, end };
}
