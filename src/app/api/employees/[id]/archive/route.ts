import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeAuditLog } from "@/lib/audit";

// POST /api/employees/[id]/archive — offboarding. Marks the employee
// inactive and stamps archivedAt rather than deleting the row, so leave,
// payroll, and attendance history stay intact for the retention period
// (acceptance criteria: "archive... don't hard-delete").
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_ARCHIVE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  if (existing.employmentStatus === "ARCHIVED") {
    return NextResponse.json(
      { error: "Employee is already archived." },
      { status: 409 }
    );
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const archived = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.update({
      where: { id },
      data: { employmentStatus: "ARCHIVED", archivedAt: new Date() },
    });

    await tx.user.updateMany({
      where: { employeeId: id },
      data: { isActive: false },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "employee.archive",
      entity: "Employee",
      entityId: String(id),
    });

    return employee;
  });

  return NextResponse.json({ employee: archived });
}
