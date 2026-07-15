import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { decideLeaveRequestSchema } from "@/lib/validation/leave";
import { countLeaveDays } from "@/lib/leave/days";
import { writeAuditLog } from "@/lib/audit";
import {
  notifyDelegate,
  notifyHrPendingSignOff,
  notifyLeaveDecision,
} from "@/lib/leave/notify";

// POST /api/leave-requests/[id]/decide — approve or decline at whichever
// stage the request currently sits at. The stage (and therefore who's
// authorized to act) is derived from the request's own `status`, not from
// anything the client asserts — the client only ever sends { decision,
// reason }, never which stage it thinks it's deciding.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid leave request id." }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, workEmail: true, lineManagerId: true } },
      leaveType: true,
    },
  });
  if (!leaveRequest) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }

  if (leaveRequest.status === "APPROVED" || leaveRequest.status === "DECLINED") {
    return NextResponse.json(
      { error: "This request has already been decided." },
      { status: 409 }
    );
  }

  const isSupervisorStage = leaveRequest.status === "PENDING_SUPERVISOR";
  const canActAsHr = hasPermission(session, PERMISSIONS.LEAVE_APPROVE_FINAL);
  const canActAsSupervisor =
    hasPermission(session, PERMISSIONS.LEAVE_APPROVE_SUPERVISOR) &&
    session.employeeId === leaveRequest.employee.lineManagerId;

  const authorized = isSupervisorStage ? canActAsSupervisor || canActAsHr : canActAsHr;
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = decideLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { decision, reason } = parsed.data;

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });
  const actorName = actor?.fullName ?? "Unknown";
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    if (isSupervisorStage) {
      if (decision === "DECLINE") {
        const result = await tx.leaveRequest.update({
          where: { id },
          data: {
            status: "DECLINED",
            supervisorApproverId: session.employeeId,
            supervisorDecidedAt: now,
            decisionReason: reason,
          },
        });
        await writeAuditLog(tx, {
          actorId: session.userId,
          actorName,
          action: "leave.decline_supervisor",
          entity: "LeaveRequest",
          entityId: String(id),
          metadata: { reason },
        });
        return result;
      }

      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: "PENDING_HR",
          supervisorApproverId: session.employeeId,
          supervisorDecidedAt: now,
        },
      });
      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName,
        action: "leave.approve_supervisor",
        entity: "LeaveRequest",
        entityId: String(id),
      });
      return result;
    }

    // HR stage
    if (decision === "DECLINE") {
      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: "DECLINED",
          hrApproverId: session.employeeId,
          hrDecidedAt: now,
          decisionReason: reason,
        },
      });
      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName,
        action: "leave.decline_final",
        entity: "LeaveRequest",
        entityId: String(id),
        metadata: { reason },
      });
      return result;
    }

    const result = await tx.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED", hrApproverId: session.employeeId, hrDecidedAt: now },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName,
      action: "leave.approve_final",
      entity: "LeaveRequest",
      entityId: String(id),
    });

    if (leaveRequest.leaveType.tracksBalance) {
      const days = countLeaveDays(leaveRequest.startDate, leaveRequest.endDate);
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
          },
        },
      });
      const before = balance ? Number(balance.remainingDays) : 0;
      const after = before - days;

      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
          },
        },
        data: { remainingDays: after },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName,
        action: "leave.balance_adjusted",
        entity: "LeaveBalance",
        entityId: `${leaveRequest.employeeId}:${leaveRequest.leaveTypeId}`,
        metadata: { leaveRequestId: id, daysDeducted: days, before, after },
      });
    }

    return result;
  });

  if (isSupervisorStage && decision === "APPROVE") {
    await notifyHrPendingSignOff({
      employeeName: leaveRequest.employee.fullName,
      leaveTypeName: leaveRequest.leaveType.name,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    });
  } else if (updated.status === "APPROVED" || updated.status === "DECLINED") {
    await notifyLeaveDecision({
      employeeWorkEmail: leaveRequest.employee.workEmail,
      employeeName: leaveRequest.employee.fullName,
      leaveTypeName: leaveRequest.leaveType.name,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      decision: updated.status,
      decisionReason: updated.decisionReason,
    });

    if (updated.status === "APPROVED" && leaveRequest.delegateId) {
      await notifyDelegate({
        delegateId: leaveRequest.delegateId,
        employeeName: leaveRequest.employee.fullName,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      });
    }
  }

  return NextResponse.json({ request: updated });
}
