import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeAuditLog } from "@/lib/audit";

// POST /api/payroll/runs/[id]/approve-hr — HR signs off that the
// calculated + adjusted figures are correct. Moves DRAFT -> HR_APPROVED,
// after which the run is locked from further adjustments and awaits
// Finance's independent sign-off before payment.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_HR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid payroll run id." }, { status: 400 });
  }

  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }
  if (run.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft runs can be HR-approved." },
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
        status: "HR_APPROVED",
        hrApprovedById: session.userId,
        hrApprovedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "payroll.approved_hr",
      entity: "PayrollRun",
      entityId: String(id),
    });

    return updated;
  });

  return NextResponse.json({ run: updated });
}
