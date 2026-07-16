import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { canViewPayrollRun } from "@/lib/payroll-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid payroll run id." }, { status: 400 });
  }

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, employeeId: true, department: true } },
      adjustments: { include: { createdBy: { select: { email: true } } }, orderBy: { createdAt: "asc" } },
      hrApprovedBy: { select: { email: true } },
      financeApprovedBy: { select: { email: true } },
    },
  });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }
  if (!canViewPayrollRun(session, run)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ run });
}
