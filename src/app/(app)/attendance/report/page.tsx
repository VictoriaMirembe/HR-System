import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  CHRONIC_LATE_THRESHOLD,
  CHRONIC_LATE_WINDOW_DAYS,
  ORG_TIMEZONE,
} from "@/lib/attendance/config";
import { startOfDayInTimeZone } from "@/lib/attendance/timezone";

export default async function AttendanceReportPage() {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.ATTENDANCE_REPORT)) {
    redirect("/attendance");
  }

  // "Today" means today in Kampala, not today on whatever server this
  // happens to run on — same reasoning as isLateClockIn (see late.ts).
  const todayStart = startOfDayInTimeZone(new Date(), ORG_TIMEZONE);

  const todayRecords = await prisma.attendanceRecord.findMany({
    where: { clockIn: { gte: todayStart } },
    include: {
      employee: { select: { fullName: true, department: true, employeeId: true } },
    },
    orderBy: { clockIn: "asc" },
  });

  const lateToday = todayRecords.filter((record) => record.isLate).length;

  const windowStart = new Date(
    Date.now() - CHRONIC_LATE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const lateCounts = await prisma.attendanceRecord.groupBy({
    by: ["employeeId"],
    where: { isLate: true, clockIn: { gte: windowStart } },
    _count: { _all: true },
  });

  const chronicallyLateIds = lateCounts
    .filter((row) => row._count._all >= CHRONIC_LATE_THRESHOLD)
    .sort((a, b) => b._count._all - a._count._all);

  const chronicallyLateEmployees = await prisma.employee.findMany({
    where: { id: { in: chronicallyLateIds.map((row) => row.employeeId) } },
    select: { id: true, fullName: true, department: true, employeeId: true },
  });
  const chronicallyLate = chronicallyLateIds.map((row) => ({
    ...row,
    employee: chronicallyLateEmployees.find((e) => e.id === row.employeeId),
  }));

  // Absent today = active employees with zero clock-ins today. There's no
  // separate "absent" record to maintain: every active employee starts the
  // day in this list by default (they simply haven't clocked in yet), and
  // drops out the moment a clock-in row exists. For a day that's already
  // over, this can never change afterwards, since clock-in always stamps
  // the current moment and can't be backdated.
  const activeEmployees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true, fullName: true, department: true, employeeId: true },
  });
  const presentTodayIds = new Set(todayRecords.map((record) => record.employeeId));
  const absentEmployees = activeEmployees.filter(
    (employee) => !presentTodayIds.has(employee.id)
  );

  const lastSeenRows = await prisma.attendanceRecord.groupBy({
    by: ["employeeId"],
    where: { employeeId: { in: absentEmployees.map((e) => e.id) } },
    _max: { clockIn: true },
  });
  const lastSeenByEmployeeId = new Map(
    lastSeenRows.map((row) => [row.employeeId, row._max.clockIn])
  );

  // Cross-reference with Leave Management: an absence is "excused" if the
  // employee has an approved leave request covering today, otherwise it's
  // unauthorized. This is the distinction the original acceptance criteria
  // asks for ("unauthorized absences") — it only became possible once
  // Leave Management existed to provide the excused side of the check.
  const excusedLeaveToday = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      employeeId: { in: absentEmployees.map((e) => e.id) },
      startDate: { lte: todayStart },
      endDate: { gte: todayStart },
    },
    select: { employeeId: true, leaveType: { select: { name: true } } },
  });
  const excusedByEmployeeId = new Map(
    excusedLeaveToday.map((row) => [row.employeeId, row.leaveType.name])
  );
  const unauthorizedCount = absentEmployees.filter(
    (employee) => !excusedByEmployeeId.has(employee.id)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Attendance report
        </h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <StatCard label="Clocked in today" value={String(todayRecords.length)} />
        <StatCard label="Late today" value={String(lateToday)} />
        <StatCard label="Absent today" value={String(absentEmployees.length)} />
        <StatCard label="Unauthorized" value={String(unauthorizedCount)} />
        <StatCard
          label="Chronically late"
          value={String(chronicallyLate.length)}
        />
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Absent today
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Active employees with no clock-in yet today. This list shrinks as
          people clock in through the day, and freezes once the day ends.
          Cross-referenced against approved leave to separate excused
          absences from unauthorized ones.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Last clocked in</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {absentEmployees.map((employee) => {
                const lastSeen = lastSeenByEmployeeId.get(employee.id);
                const excusedLeaveType = excusedByEmployeeId.get(employee.id);
                return (
                  <tr key={employee.id}>
                    <td className="px-4 py-2 text-slate-900">
                      {employee.fullName}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {employee.department}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {lastSeen ? lastSeen.toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-2">
                      {excusedLeaveType ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          On {excusedLeaveType}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Unauthorized
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {absentEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Everyone active has clocked in today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Chronically late
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          {CHRONIC_LATE_THRESHOLD}+ late clock-ins in the trailing{" "}
          {CHRONIC_LATE_WINDOW_DAYS} days.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Late count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {chronicallyLate.map((row) => (
                <tr key={row.employeeId}>
                  <td className="px-4 py-2 text-slate-900">
                    {row.employee?.fullName ?? "Unknown"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {row.employee?.department ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {row._count._all}
                    </span>
                  </td>
                </tr>
              ))}
              {chronicallyLate.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    No one meets the chronic lateness threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Today
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Clock in</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {todayRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {record.employee.fullName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {record.employee.department}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {record.clockIn.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{record.method}</td>
                  <td className="px-4 py-2">
                    {record.isLate ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Late
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        On time
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {todayRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No one has clocked in yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-600/70">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
