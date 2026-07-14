// Shared timezone helpers, built on Intl (no extra date-library dependency
// needed). Used by late.ts (is this clock-in late) and the HR attendance
// report (what counts as "today") — both need to reason about time in
// ORG_TIMEZONE rather than whatever time zone the server happens to run in.

export function getTimeInTimeZone(
  date: Date,
  timeZone: string
): { hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23", // 0–23, avoids parsing "12 AM" vs "12 PM" ambiguity
  });
  const parts = formatter.formatToParts(date);
  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hours, minutes };
}

// UTC offset, in minutes, of `timeZone` at the instant `date`. Computed from
// the actual formatted offset (not a hardcoded constant) so this stays
// correct even if ORG_TIMEZONE is ever changed to a zone that observes
// daylight saving time.
function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const offsetPart = formatter
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  // e.g. "GMT+3" or "GMT+5:30"
  const match = offsetPart?.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

// The UTC instant corresponding to 00:00:00 in `timeZone`, on the calendar
// date that `date` falls on in that same time zone. Used to build a
// "since midnight, org time" query boundary instead of accidentally using
// the server's own local midnight.
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const offsetMinutes = getUtcOffsetMinutes(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60 * 1000);
}
