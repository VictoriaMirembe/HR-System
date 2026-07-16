import { describe, expect, it } from "vitest";
import { calculatePayrollBreakdown } from "./calculate";

// Standard schedule: 8h/day * 22 days = 176 standard monthly hours.
// NSSF employee rate 5%, PAYE bands as in paye.ts (see that file's tests
// for band-by-band verification) — this file checks the combination.
describe("calculatePayrollBreakdown", () => {
  it("pays base salary minus NSSF and PAYE for standard hours, no leave", () => {
    const result = calculatePayrollBreakdown({
      baseSalary: 1_760_000, // convenient number: /176 = 10,000/hr
      workedHours: 176,
      unpaidLeaveDays: 0,
    });
    expect(result.basePay).toBe(1_760_000);
    expect(result.overtimeHours).toBe(0);
    expect(result.overtimePay).toBe(0);
    expect(result.grossPay).toBe(1_760_000);

    expect(result.nssfEmployeeDeduction).toBe(88_000); // 5% of 1,760,000
    expect(result.nssfEmployerContribution).toBe(176_000); // 10%, informational

    // Chargeable income = 1,760,000 - 88,000 = 1,672,000
    // PAYE = 10,000 + 15,000 + (1,672,000 - 410,000) * 0.30 = 403,600
    expect(result.payeDeduction).toBe(403_600);

    expect(result.unpaidLeaveDeduction).toBe(0);
    expect(result.deductions).toBe(491_600); // 88,000 + 403,600
    expect(result.netPayBeforeAdjustments).toBe(1_268_400);
  });

  it("pays 1.5x hourly rate for hours beyond standard, taxed accordingly", () => {
    const result = calculatePayrollBreakdown({
      baseSalary: 1_760_000, // hourly rate = 10,000
      workedHours: 186, // 10 hours of overtime
      unpaidLeaveDays: 0,
    });
    expect(result.overtimeHours).toBe(10);
    expect(result.overtimePay).toBe(150_000); // 10 * 10,000 * 1.5
    expect(result.grossPay).toBe(1_910_000);

    expect(result.nssfEmployeeDeduction).toBe(95_500); // 5% of 1,910,000
    // Chargeable income = 1,910,000 - 95,500 = 1,814,500
    // PAYE = 25,000 + (1,814,500 - 410,000) * 0.30 = 446,350
    expect(result.payeDeduction).toBe(446_350);
    expect(result.netPayBeforeAdjustments).toBe(1_368_150);
  });

  it("never counts negative overtime for under-worked hours", () => {
    const result = calculatePayrollBreakdown({
      baseSalary: 1_760_000,
      workedHours: 100,
      unpaidLeaveDays: 0,
    });
    expect(result.overtimeHours).toBe(0);
    expect(result.overtimePay).toBe(0);
  });

  it("deducts unpaid leave at the daily rate, on top of NSSF/PAYE", () => {
    const result = calculatePayrollBreakdown({
      baseSalary: 2_200_000, // daily rate = 2,200,000 / 22 = 100,000
      workedHours: 176,
      unpaidLeaveDays: 3,
    });
    expect(result.unpaidLeaveDeduction).toBe(300_000);

    expect(result.nssfEmployeeDeduction).toBe(110_000); // 5% of 2,200,000
    // Chargeable income = 2,200,000 - 110,000 = 2,090,000
    // PAYE = 25,000 + (2,090,000 - 410,000) * 0.30 = 529,000
    expect(result.payeDeduction).toBe(529_000);

    expect(result.deductions).toBe(939_000); // 110,000 + 529,000 + 300,000
    expect(result.netPayBeforeAdjustments).toBe(1_261_000);
  });

  it("combines overtime pay and unpaid leave deduction with statutory deductions", () => {
    const result = calculatePayrollBreakdown({
      baseSalary: 1_760_000, // hourly 10,000, daily 80,000
      workedHours: 180, // 4h overtime
      unpaidLeaveDays: 2,
    });
    expect(result.overtimePay).toBe(60_000); // 4 * 10,000 * 1.5
    expect(result.unpaidLeaveDeduction).toBe(160_000); // 2 * 80,000
    expect(result.grossPay).toBe(1_820_000);

    expect(result.nssfEmployeeDeduction).toBe(91_000); // 5% of 1,820,000
    // Chargeable income = 1,820,000 - 91,000 = 1,729,000
    // PAYE = 25,000 + (1,729,000 - 410,000) * 0.30 = 420,700
    expect(result.payeDeduction).toBe(420_700);

    expect(result.deductions).toBe(671_700); // 91,000 + 420,700 + 160,000
    expect(result.netPayBeforeAdjustments).toBe(1_148_300);
  });
});
