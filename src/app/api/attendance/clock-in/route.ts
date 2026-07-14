import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { clockInSchema } from "@/lib/validation/attendance";
import { CLOCK_IN_METHODS } from "@/lib/attendance/methods";
import { isLateClockIn } from "@/lib/attendance/late";
import { writeAuditLog } from "@/lib/audit";

// POST /api/attendance/clock-in — always clocks in the CALLING employee
// (session.employeeId), never an arbitrary employee id from the request
// body. There's no permission model here for "clock someone else in" — an
// employee's own attendance record is something only they (or the pluggable
// device/geofence check standing in for them) can create.
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.ATTENDANCE_CLOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = clockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { method, coordinates } = parsed.data;

  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId: session.employeeId, clockOut: null },
  });
  if (openRecord) {
    return NextResponse.json(
      { error: "You're already clocked in." },
      { status: 409 }
    );
  }

  const provider = CLOCK_IN_METHODS[method];
  const verification = await provider.verify({ coordinates });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const now = new Date();
  const late = isLateClockIn(now);

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.attendanceRecord.create({
      data: {
        employeeId: session.employeeId,
        clockIn: now,
        method,
        isLate: late,
        flags: late ? ["late"] : [],
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "attendance.clock_in",
      entity: "AttendanceRecord",
      entityId: String(created.id),
      metadata: { method, isLate: late },
    });

    return created;
  });

  return NextResponse.json({ record }, { status: 201 });
}
