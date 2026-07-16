// Pure so it's cheaply testable — the dashboard passes in an hour already
// resolved to ORG_TIMEZONE (see src/lib/attendance/timezone.ts) rather than
// server-local time, for the same timezone-correctness reason attendance
// does.
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
