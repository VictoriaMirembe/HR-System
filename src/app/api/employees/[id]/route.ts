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
  // roleId lives on User, not Employee — pulled out here so the rest of
  // `data` can still be passed straight into `tx.employee.update({ data })`
  // without Prisma rejecting an unknown column.
  const { roleId, ...data } = parsed.data;

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

  // Validate the target role up front (outside the transaction) so a bad
  // roleId fails with a clean 400 instead of a mid-transaction rollback.
  let newRole: { id: number; name: string } | null = null;
  const existingUser =
    roleId !== undefined
      ? await prisma.user.findUnique({
          where: { employeeId: id },
          include: { role: { select: { id: true, name: true } } },
        })
      : null;
  if (roleId !== undefined) {
    if (!existingUser) {
      return NextResponse.json(
        { error: "This employee has no linked user account." },
        { status: 400 }
      );
    }
    newRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!newRole) {
      return NextResponse.json(
        { error: "Selected role does not exist." },
        { status: 400 }
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

    if (Object.keys(data).length > 0) {
      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName: actor?.fullName ?? "Unknown",
        action: "employee.update",
        entity: "Employee",
        entityId: String(id),
        metadata: { fields: Object.keys(data) },
      });
    }

    // Role lives on User, not Employee, so it's a second update in the
    // same transaction — kept atomic with the audit write for the same
    // reason every other mutation in this system is: the audit trail must
    // never disagree with what actually changed.
    if (newRole && existingUser && newRole.id !== existingUser.role.id) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { roleId: newRole.id },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName: actor?.fullName ?? "Unknown",
        action: "user.role_changed",
        entity: "User",
        entityId: String(existingUser.id),
        metadata: {
          fromRole: existingUser.role.name,
          toRole: newRole.name,
        },
      });
    }

    return employee;
  });

  return NextResponse.json({ employee: updated });
}
