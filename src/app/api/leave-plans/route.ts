import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createLeavePlanSchema } from "@/lib/validation/leave-plan";
import { writeAuditLog } from "@/lib/audit";

const BROAD_VISIBILITY_ROLES = new Set(["HR Administrator", "Senior Management"]);

// GET /api/leave-plans — HR/Senior Management see everyone's (for the
// "avoid scheduling conflicts" reporting use case); everyone else sees
// only their own.
export async function GET() {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.LEAVE_PLAN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = BROAD_VISIBILITY_ROLES.has(session.roleName)
    ? {}
    : { employeeId: session.employeeId };

  const plans = await prisma.leavePlan.findMany({
    where,
    include: {
      leaveType: { select: { name: true } },
      employee: { select: { fullName: true, department: true } },
    },
    orderBy: [{ year: "desc" }, { plannedStartDate: "asc" }],
  });

  return NextResponse.json({ plans });
}

// POST /api/leave-plans — create or update the caller's own plan for a
// given leave type + year (upsert, since only one plan per
// employee/leaveType/year is meaningful — resubmitting replaces it rather
// than piling up duplicates).
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.LEAVE_PLAN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createLeavePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: data.leaveTypeId },
  });
  if (!leaveType) {
    return NextResponse.json({ error: "Leave type not found." }, { status: 400 });
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const plan = await prisma.$transaction(async (tx) => {
    const upserted = await tx.leavePlan.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: session.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      update: {
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        notes: data.notes ?? null,
      },
      create: {
        employeeId: session.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        notes: data.notes ?? null,
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "leave_plan.submit",
      entity: "LeavePlan",
      entityId: String(upserted.id),
      metadata: { leaveType: leaveType.name, year: data.year },
    });

    return upserted;
  });

  return NextResponse.json({ plan }, { status: 201 });
}
