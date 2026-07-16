import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeAuditLog } from "@/lib/audit";
import { notifyPayslipReady } from "@/lib/payroll/notify";

// POST /api/payroll/runs/[id]/approve-finance — Finance Officer verifies
// the HR-approved run and marks it approved for payment. Per the
// acceptance criteria, this is NOT a real money transfer — it only flips
// the status the system tracks; actually moving money is out of scope.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_FINANCE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid payroll run id." }, { status: 400 });
  }

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true, workEmail: true } } },
  });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }
  if (run.status !== "HR_APPROVED") {
    return NextResponse.json(
      { error: "Only HR-approved runs can be approved for payment." },
      { status: 409 }
    );
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRun.update({
      where: { id },
      data: {
        status: "APPROVED_FOR_PAYMENT",
        financeApprovedById: session.userId,
        financeApprovedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "payroll.approved_finance",
      entity: "PayrollRun",
      entityId: String(id),
    });

    return updated;
  });

  await notifyPayslipReady({
    employeeWorkEmail: run.employee.workEmail,
    employeeName: run.employee.fullName,
    period: run.period,
    netPay: Number(updated.netPay),
  });

  return NextResponse.json({ run: updated });
}
