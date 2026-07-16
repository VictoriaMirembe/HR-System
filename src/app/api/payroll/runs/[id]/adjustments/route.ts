import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createPayrollAdjustmentSchema } from "@/lib/validation/payroll";
import { writeAuditLog } from "@/lib/audit";

// POST /api/payroll/runs/[id]/adjustments — HR-only ad-hoc bonus/deduction,
// only while the run is still DRAFT. Once HR has approved a run, its
// numbers are meant to be settled — further changes would need to go
// through re-generation (which only touches DRAFT runs) rather than a
// silent edit to an approved figure.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_ADJUST)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid payroll run id." }, { status: 400 });
  }

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { adjustments: true },
  });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }
  if (run.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Adjustments can only be added while the run is in draft." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = createPayrollAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { amount, reason } = parsed.data;

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const existingAdjustmentsTotal = run.adjustments.reduce(
    (sum, adj) => sum + Number(adj.amount),
    0
  );
  const newNetPay =
    Number(run.grossPay) - Number(run.deductions) + existingAdjustmentsTotal + amount;

  const updated = await prisma.$transaction(async (tx) => {
    const adjustment = await tx.payrollAdjustment.create({
      data: { payrollRunId: id, amount, reason, createdById: session.userId },
    });

    const run = await tx.payrollRun.update({
      where: { id },
      data: { netPay: Math.round(newNetPay * 100) / 100 },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "payroll.adjustment_added",
      entity: "PayrollRun",
      entityId: String(id),
      metadata: { adjustmentId: adjustment.id, amount, reason },
    });

    return run;
  });

  return NextResponse.json({ run: updated }, { status: 201 });
}
