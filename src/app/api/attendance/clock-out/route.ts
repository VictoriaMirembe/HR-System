import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeAuditLog } from "@/lib/audit";

// POST /api/attendance/clock-out — closes the caller's own open attendance
// record (the most recent one with clockOut still null).
export async function POST() {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.ATTENDANCE_CLOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId: session.employeeId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!openRecord) {
    return NextResponse.json(
      { error: "You're not currently clocked in." },
      { status: 400 }
    );
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceRecord.update({
      where: { id: openRecord.id },
      data: { clockOut: new Date() },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "attendance.clock_out",
      entity: "AttendanceRecord",
      entityId: String(updated.id),
    });

    return updated;
  });

  return NextResponse.json({ record });
}
