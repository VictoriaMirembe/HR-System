import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createLeaveRequestSchema } from "@/lib/validation/leave";
import { leaveRequestListWhere } from "@/lib/leave-scope";
import { countLeaveDays } from "@/lib/leave/days";
import { writeAuditLog } from "@/lib/audit";
import { notifyLeaveRequestSubmitted } from "@/lib/leave/notify";
import type { Prisma, $Enums } from "@/generated/prisma/client";

// GET /api/leave-requests?status= — scoped by role (see leave-scope.ts).
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.LEAVE_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const validStatuses = ["PENDING_SUPERVISOR", "PENDING_HR", "APPROVED", "DECLINED"];

  const where: Prisma.LeaveRequestWhereInput = {
    ...leaveRequestListWhere(session),
    ...(status && validStatuses.includes(status)
      ? { status: status as $Enums.LeaveRequestStatus }
      : {}),
  };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { select: { id: true, fullName: true, department: true } },
      leaveType: { select: { name: true } },
      delegate: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

// POST /api/leave-requests — an employee requesting leave for themselves.
// Routes to PENDING_SUPERVISOR if they have a line manager on file, or
// straight to PENDING_HR if not (see notify.ts for the matching email
// logic).
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.LEAVE_REQUEST)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, fullName: true, lineManagerId: true, gender: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
  }

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: data.leaveTypeId },
  });
  if (!leaveType) {
    return NextResponse.json({ error: "Leave type not found." }, { status: 400 });
  }

  if (leaveType.restrictedToGender && leaveType.restrictedToGender !== employee.gender) {
    return NextResponse.json(
      {
        error: employee.gender
          ? `${leaveType.name} is not available for your profile.`
          : `${leaveType.name} requires gender to be set on your employee profile. Contact HR.`,
      },
      { status: 400 }
    );
  }

  // Some leave types (Annual Leave, Exam Leave) require the employee to
  // have submitted a leave plan for the year the request falls in before
  // they're eligible to actually request it — see LeaveType.requiresPlan.
  if (leaveType.requiresPlan) {
    const requestYear = data.startDate.getFullYear();
    const plan = await prisma.leavePlan.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: requestYear,
        },
      },
    });
    if (!plan) {
      return NextResponse.json(
        {
          error: `You need to submit a ${requestYear} leave plan for ${leaveType.name} before requesting it. Go to Leave > Leave plans.`,
        },
        { status: 400 }
      );
    }
  }

  if (data.delegateId) {
    if (data.delegateId === employee.id) {
      return NextResponse.json(
        { error: "You cannot delegate to yourself." },
        { status: 400 }
      );
    }
    const delegate = await prisma.employee.findUnique({
      where: { id: data.delegateId },
    });
    if (!delegate) {
      return NextResponse.json(
        { error: "Selected delegate does not exist." },
        { status: 400 }
      );
    }
  }

  const requestedDays = countLeaveDays(data.startDate, data.endDate);

  if (leaveType.tracksBalance) {
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
        },
      },
    });
    const remaining = balance ? Number(balance.remainingDays) : 0;
    if (remaining < requestedDays) {
      return NextResponse.json(
        {
          error: `Insufficient ${leaveType.name} balance: requested ${requestedDays} day(s), ${remaining} remaining.`,
        },
        { status: 400 }
      );
    }
  }

  const initialStatus = employee.lineManagerId ? "PENDING_SUPERVISOR" : "PENDING_HR";

  const created = await prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        delegateId: data.delegateId ?? null,
        status: initialStatus,
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: employee.fullName,
      action: "leave.request_submitted",
      entity: "LeaveRequest",
      entityId: String(leaveRequest.id),
      metadata: { leaveType: leaveType.name, days: requestedDays, initialStatus },
    });

    return leaveRequest;
  });

  await notifyLeaveRequestSubmitted({
    employeeName: employee.fullName,
    leaveTypeName: leaveType.name,
    startDate: data.startDate,
    endDate: data.endDate,
    lineManagerId: employee.lineManagerId,
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
