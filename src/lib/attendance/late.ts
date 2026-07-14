import {
  WORKDAY_START_HOUR,
  WORKDAY_START_MINUTE,
  LATE_GRACE_MINUTES,
  ORG_TIMEZONE,
} from "@/lib/attendance/config";
import { getTimeInTimeZone } from "@/lib/attendance/timezone";

// Pure aside from reading the fixed ORG_TIMEZONE constant, so it's cheaply
// unit-testable without a database — the clock-in route
// (src/app/api/attendance/clock-in/route.ts) just calls this with
// `new Date()`.
export function isLateClockIn(clockIn: Date): boolean {
  const { hours, minutes } = getTimeInTimeZone(clockIn, ORG_TIMEZONE);
  const minutesSinceMidnight = hours * 60 + minutes;
  const cutoff =
    WORKDAY_START_HOUR * 60 + WORKDAY_START_MINUTE + LATE_GRACE_MINUTES;
  return minutesSinceMidnight > cutoff;
}
