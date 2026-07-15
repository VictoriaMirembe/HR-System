import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { updateEmployeeSchema } from "@/lib/validation/employee";
import { writeAuditLog } from "@/lib/audit";
import { canViewEmployee } from "@/lib/employee-scope";
import { grantEligibleLeaveBalances } from "@/lib/leave/grant-balances";

async function parseId(
  params: Promise<{ id: string }>
): Promise<number | null> {
  const { id } = await params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = await parseId(params);
  if (id === null) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { lineManager: { select: { id: true, fullName: true } } },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  if (!canViewEmployee(session, employee)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ employee });
}

// PATCH /api/employees/[id] — HR-only. Every field (including job title,
// department, salary, bank/TIN/NSSF) is HR-editable here; the acceptance
// criteria for the Employee Self-Service Portal (a later feature) will add
// a separate, narrower route for employees editing their own contact info.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = await parseId(params);
  if (id === null) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.lineManagerId === id) {
    return NextResponse.json(
      { error: "An employee cannot be their own line manager." },
      { status: 400 }
    );
  }

  if (
    data.personalEmail &&
    data.personalEmail !== existing.personalEmail
  ) {
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
  if (data.workEmail && data.workEmail !== existing.workEmail) {
    const taken = await prisma.employee.findUnique({
      where: { workEmail: data.workEmail },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Work email already in use." },
        { status: 409 }
      );
    }
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.update({
      where: { id },
      data,
    });

    // Setting (or correcting) gender may make the employee newly eligible
    // for Maternity/Paternity Leave — grant it now rather than leaving them
    // without a balance until someone happens to re-run the seed script.
    if (data.gender !== undefined) {
      await grantEligibleLeaveBalances(tx, id, employee.gender);
    }

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "employee.update",
      entity: "Employee",
      entityId: String(id),
      metadata: { fields: Object.keys(data) },
    });

    return employee;
  });

  return NextResponse.json({ employee: updated });
}
