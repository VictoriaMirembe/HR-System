// Inclusive calendar-day count between two dates (a 3-day leave request
// from Monday to Wednesday counts as 3 days). This deliberately counts
// calendar days, not working days — excluding weekends/public holidays
// from the count would need a holiday calendar, which isn't part of this
// build. Known simplification, worth revisiting if HR needs exact
// working-day accounting.
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endUtc = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  return Math.round((endUtc - startUtc) / msPerDay) + 1;
}
