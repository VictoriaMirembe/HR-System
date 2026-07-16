import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { isValidPeriod } from "@/lib/payroll/period";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET /api/payroll/report?period=YYYY-MM — downloadable CSV of every
// payroll run for a period, regardless of status (so HR/Finance can also
// export drafts to sanity-check before approving).
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_REPORT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "";
  if (!isValidPeriod(period)) {
    return NextResponse.json(
      { error: "period query param must be in YYYY-MM format." },
      { status: 400 }
    );
  }

  const runs = await prisma.payrollRun.findMany({
    where: { period },
    include: {
      employee: { select: { employeeId: true, fullName: true, department: true } },
      adjustments: true,
    },
    orderBy: { employee: { fullName: "asc" } },
  });

  const header = [
    "Employee ID",
    "Name",
    "Department",
    "Base Pay",
    "Overtime Hours",
    "Overtime Pay",
    "Gross Pay",
    "NSSF (Employee)",
    "NSSF (Employer, informational)",
    "PAYE",
    "Unpaid Leave Days",
    "Unpaid Leave Deduction",
    "Late Days",
    "Adjustments Total",
    "Deductions",
    "Net Pay",
    "Status",
  ];

  const rows = runs.map((run) => {
    const adjustmentsTotal = run.adjustments.reduce((sum, a) => sum + Number(a.amount), 0);
    return [
      run.employee.employeeId,
      run.employee.fullName,
      run.employee.department,
      Number(run.basePay).toFixed(2),
      Number(run.overtimeHours).toFixed(2),
      Number(run.overtimePay).toFixed(2),
      Number(run.grossPay).toFixed(2),
      Number(run.nssfEmployeeDeduction).toFixed(2),
      Number(run.nssfEmployerContribution).toFixed(2),
      Number(run.payeDeduction).toFixed(2),
      Number(run.unpaidLeaveDays).toFixed(2),
      Number(run.unpaidLeaveDeduction).toFixed(2),
      String(run.lateDaysCount),
      adjustmentsTotal.toFixed(2),
      Number(run.deductions).toFixed(2),
      Number(run.netPay).toFixed(2),
      run.status,
    ].map((cell) => csvEscape(String(cell)));
  });

  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${period}.csv"`,
    },
  });
}
