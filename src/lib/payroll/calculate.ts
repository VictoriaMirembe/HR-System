import {
  STANDARD_MONTHLY_HOURS,
  STANDARD_WORKDAYS_PER_MONTH,
  OVERTIME_RATE_MULTIPLIER,
  NSSF_EMPLOYEE_RATE,
  NSSF_EMPLOYER_RATE,
} from "@/lib/payroll/config";
import { calculatePaye } from "@/lib/payroll/paye";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PayrollBreakdown = {
  basePay: number;
  overtimeHours: number;
  overtimePay: number;
  grossPay: number;
  nssfEmployeeDeduction: number;
  nssfEmployerContribution: number;
  payeDeduction: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  deductions: number;
  netPayBeforeAdjustments: number;
};

// Pure function — no database access — so it's cheaply unit-testable. The
// generate-payroll route (src/app/api/payroll/runs/generate/route.ts) does
// the DB queries (attendance hours worked, approved unpaid leave days) and
// passes the results in here.
//
// Rounds to 2 decimal places at each monetary step (not just the final
// result) so displayed line items always sum to the displayed totals —
// otherwise a payslip could show e.g. "21.00 + 3.33 = 24.34" due to
// unrounded intermediate values.
//
// Deduction order: gross pay -> NSSF (employee's 5%) -> PAYE is computed on
// income AFTER the NSSF deduction (NSSF contributions are pre-tax) -> then
// unpaid leave is deducted separately at the daily rate. Ad-hoc
// adjustments (bonuses/deductions HR adds by hand) are NOT part of this
// function — they're applied afterward, on top of netPayBeforeAdjustments.
export function calculatePayrollBreakdown(params: {
  baseSalary: number;
  workedHours: number;
  unpaidLeaveDays: number;
}): PayrollBreakdown {
  const { baseSalary, workedHours, unpaidLeaveDays } = params;

  const hourlyRate = baseSalary / STANDARD_MONTHLY_HOURS;
  const dailyRate = baseSalary / STANDARD_WORKDAYS_PER_MONTH;

  const overtimeHours = round2(Math.max(0, workedHours - STANDARD_MONTHLY_HOURS));
  const overtimePay = round2(overtimeHours * hourlyRate * OVERTIME_RATE_MULTIPLIER);

  const basePay = round2(baseSalary);
  const grossPay = round2(basePay + overtimePay);

  const nssfEmployeeDeduction = round2(grossPay * NSSF_EMPLOYEE_RATE);
  const nssfEmployerContribution = round2(grossPay * NSSF_EMPLOYER_RATE);

  const chargeableIncome = round2(grossPay - nssfEmployeeDeduction);
  const payeDeduction = calculatePaye(chargeableIncome);

  const roundedUnpaidLeaveDays = round2(unpaidLeaveDays);
  const unpaidLeaveDeduction = round2(roundedUnpaidLeaveDays * dailyRate);

  const deductions = round2(nssfEmployeeDeduction + payeDeduction + unpaidLeaveDeduction);
  const netPayBeforeAdjustments = round2(grossPay - deductions);

  return {
    basePay,
    overtimeHours,
    overtimePay,
    grossPay,
    nssfEmployeeDeduction,
    nssfEmployerContribution,
    payeDeduction,
    unpaidLeaveDays: roundedUnpaidLeaveDays,
    unpaidLeaveDeduction,
    deductions,
    netPayBeforeAdjustments,
  };
}
