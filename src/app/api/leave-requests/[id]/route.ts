import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { canViewLeaveRequest } from "@/lib/leave-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.LEAVE_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid leave request id." }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, department: true, lineManagerId: true } },
      leaveType: true,
      supervisorApprover: { select: { fullName: true } },
      hrApprover: { select: { fullName: true } },
      delegate: { select: { id: true, fullName: true } },
    },
  });
  if (!leaveRequest) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }
  if (!canViewLeaveRequest(session, leaveRequest)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request: leaveRequest });
}
