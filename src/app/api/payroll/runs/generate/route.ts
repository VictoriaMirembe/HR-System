import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { generatePayrollSchema } from "@/lib/validation/payroll";
import { getPeriodBounds } from "@/lib/payroll/period";
import { calculatePayrollBreakdown } from "@/lib/payroll/calculate";
import { countLeaveDays } from "@/lib/leave/days";
import { writeAuditLog } from "@/lib/audit";

// POST /api/payroll/runs/generate — HR-only. Computes a DRAFT PayrollRun
// per active employee for the given period, from their base salary plus
// Attendance (worked/overtime hours, late days) and Leave (approved Unpaid
// Leave days) data. Existing DRAFT runs for the period are recalculated;
// runs already HR_APPROVED or APPROVED_FOR_PAYMENT are left untouched
// (regenerating would silently overwrite a finalized figure).
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_GENERATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = generatePayrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { period } = parsed.data;
  const { start, end } = getPeriodBounds(period);
  // Last calendar day actually in the period, for clipping leave ranges
  // that extend past the period's exclusive end boundary.
  const periodLastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const activeEmployees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true, fullName: true, salary: true },
  });

  const existingRuns = await prisma.payrollRun.findMany({
    where: { period, employeeId: { in: activeEmployees.map((e) => e.id) } },
    select: { id: true, employeeId: true, status: true },
  });
  const existingRunByEmployeeId = new Map(existingRuns.map((r) => [r.employeeId, r]));

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });
  const actorName = actor?.fullName ?? "Unknown";

  let generatedCount = 0;
  let skippedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const employee of activeEmployees) {
      const existing = existingRunByEmployeeId.get(employee.id);
      if (existing && existing.status !== "DRAFT") {
        skippedCount += 1;
        continue;
      }

      const attendanceRecords = await tx.attendanceRecord.findMany({
        where: {
          employeeId: employee.id,
          clockIn: { gte: start, lt: end },
          clockOut: { not: null },
        },
        select: { clockIn: true, clockOut: true, isLate: true },
      });

      const workedHours = attendanceRecords.reduce((sum, record) => {
        if (!record.clockOut) return sum;
        const hours = (record.clockOut.getTime() - record.clockIn.getTime()) / 3_600_000;
        return sum + hours;
      }, 0);
      const lateDaysCount = attendanceRecords.filter((r) => r.isLate).length;

      const unpaidLeaveRequests = await tx.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          status: "APPROVED",
          leaveType: { name: "Unpaid Leave" },
          startDate: { lt: end },
          endDate: { gte: start },
        },
        select: { startDate: true, endDate: true },
      });
      const unpaidLeaveDays = unpaidLeaveRequests.reduce((sum, req) => {
        const clippedStart = req.startDate < start ? start : req.startDate;
        const clippedEnd = req.endDate > periodLastDay ? periodLastDay : req.endDate;
        return sum + countLeaveDays(clippedStart, clippedEnd);
      }, 0);

      const breakdown = calculatePayrollBreakdown({
        baseSalary: Number(employee.salary),
        workedHours,
        unpaidLeaveDays,
      });

      const data = {
        basePay: breakdown.basePay,
        overtimeHours: breakdown.overtimeHours,
        overtimePay: breakdown.overtimePay,
        nssfEmployeeDeduction: breakdown.nssfEmployeeDeduction,
        nssfEmployerContribution: breakdown.nssfEmployerContribution,
        payeDeduction: breakdown.payeDeduction,
        unpaidLeaveDays: breakdown.unpaidLeaveDays,
        unpaidLeaveDeduction: breakdown.unpaidLeaveDeduction,
        lateDaysCount,
        grossPay: breakdown.grossPay,
        deductions: breakdown.deductions,
        netPay: breakdown.netPayBeforeAdjustments,
      };

      const run = existing
        ? await tx.payrollRun.update({ where: { id: existing.id }, data })
        : await tx.payrollRun.create({
            data: { ...data, period, employeeId: employee.id, status: "DRAFT" },
          });

      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName,
        action: existing ? "payroll.run_recalculated" : "payroll.run_generated",
        entity: "PayrollRun",
        entityId: String(run.id),
        metadata: { period, employeeId: employee.id },
      });

      generatedCount += 1;
    }
  });

  return NextResponse.json({ generatedCount, skippedCount });
}
