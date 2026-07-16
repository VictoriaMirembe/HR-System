import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { selfServiceProfileSchema } from "@/lib/validation/employee-self-service";
import { writeAuditLog } from "@/lib/audit";
import { notifyHrOfProfileUpdate } from "@/lib/employees/notify";

// GET /api/employees/me — the caller's own full record, for pre-filling
// the "My Profile" form.
export async function GET() {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) {
    return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

// PATCH /api/employees/me — self-service contact info update. Takes
// effect immediately (not a pending-approval queue), then notifies HR so
// they can review it — HR retains the ability to override any field via
// the HR-only PATCH /api/employees/[id] route regardless of what an
// employee sets here.
export async function PATCH(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE_OWN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = selfServiceProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
  });

  if (data.personalEmail !== existing.personalEmail) {
    const taken = await prisma.employee.findUnique({
      where: { personalEmail: data.personalEmail },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Personal email already in use." },
        { status: 409 }
      );
    }
  }

  const changedFields = (Object.keys(data) as (keyof typeof data)[]).filter(
    (key) => data[key] !== existing[key]
  );

  if (changedFields.length === 0) {
    return NextResponse.json({ employee: existing });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.update({
      where: { id: session.employeeId },
      data,
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: existing.fullName,
      action: "employee.self_update",
      entity: "Employee",
      entityId: String(session.employeeId),
      metadata: { fields: changedFields },
    });

    return employee;
  });

  await notifyHrOfProfileUpdate({
    employeeName: existing.fullName,
    changedFields,
  });

  return NextResponse.json({ employee: updated });
}
