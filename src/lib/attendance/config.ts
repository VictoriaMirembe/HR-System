// Attendance policy constants. In a production system these would likely
// live in the database (per-department shift schedules, per-office
// geofences) rather than as code constants — kept simple here since only
// one workday schedule and one office location are needed for this build.

// Expected start of the workday, in ORG_TIMEZONE (not the server's local
// time zone — see isLateClockIn in late.ts). A clock-in after this time
// (plus the grace period) is flagged late.
export const WORKDAY_START_HOUR = 8;
export const WORKDAY_START_MINUTE = 0;
export const LATE_GRACE_MINUTES = 10;

// IANA time zone identifier the workday start time is interpreted in.
// Fixing this explicitly means "late" is always judged against MCI's
// actual office hours, regardless of what time zone the server the app
// happens to be deployed on is set to.
export const ORG_TIMEZONE = "Africa/Kampala";

// Office location for geofenced clock-in, overridable via env vars.
// Defaults to central Kampala as a placeholder — replace with the real
// office coordinates via OFFICE_LAT / OFFICE_LNG / OFFICE_RADIUS_METERS.
export const OFFICE_LOCATION = {
  lat: Number(process.env.OFFICE_LAT ?? "0.3476"),
  lng: Number(process.env.OFFICE_LNG ?? "32.5825"),
  radiusMeters: Number(process.env.OFFICE_RADIUS_METERS ?? "200"),
};

// Trailing window and threshold used to flag "chronically late" employees
// in the HR attendance report.
export const CHRONIC_LATE_WINDOW_DAYS = 30;
export const CHRONIC_LATE_THRESHOLD = 5;
