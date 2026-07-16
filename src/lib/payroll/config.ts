// Payroll calculation constants. Like attendance/config.ts, these would
// likely be per-employee or per-department configurable data in a larger
// system — kept as constants here since one standard schedule is enough
// for this build.

export const STANDARD_WORKDAY_HOURS = 8;
export const STANDARD_WORKDAYS_PER_MONTH = 22;
export const STANDARD_MONTHLY_HOURS =
  STANDARD_WORKDAY_HOURS * STANDARD_WORKDAYS_PER_MONTH;

export const OVERTIME_RATE_MULTIPLIER = 1.5;

// NSSF (National Social Security Fund, Uganda) standard contribution
// rates: employee contributes 5% of gross pay (deducted from their pay),
// employer matches with 10% (a cost to the company, NOT deducted from the
// employee — tracked as an informational field only). ⚠️ Verify against
// current NSSF guidance before relying on this for real payroll.
export const NSSF_EMPLOYEE_RATE = 0.05;
export const NSSF_EMPLOYER_RATE = 0.1;
