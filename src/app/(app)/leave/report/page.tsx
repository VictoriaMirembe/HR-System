import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { countLeaveDays } from "@/lib/leave/days";

export default async function LeaveReportPage() {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.LEAVE_REPORT)) {
    redirect("/leave");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [approvedFuture, currentlyOnLeave, sickLeaveRequests, pendingCount] =
    await Promise.all([
      // "Leave liability": approved leave not yet fully elapsed.
      prisma.leaveRequest.findMany({
        where: { status: "APPROVED", endDate: { gte: today } },
        include: { employee: { select: { fullName: true, department: true } } },
        orderBy: { startDate: "asc" },
      }),
      prisma.leaveRequest.findMany({
        where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
        include: { employee: { select: { fullName: true, department: true } } },
      }),
      prisma.leaveRequest.findMany({
        where: { leaveType: { name: "Sick Leave" } },
        include: { employee: { select: { fullName: true, department: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.leaveRequest.count({
        where: { status: { in: ["PENDING_SUPERVISOR", "PENDING_HR"] } },
      }),
    ]);

  const liabilityDays = approvedFuture.reduce(
    (sum, request) => sum + countLeaveDays(request.startDate, request.endDate),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave report</h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Currently on leave" value={String(currentlyOnLeave.length)} />
        <StatCard label="Pending requests" value={String(pendingCount)} />
        <StatCard
          label="Leave liability (days)"
          value={String(liabilityDays)}
        />
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Currently on leave
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Returns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {currentlyOnLeave.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {request.employee.fullName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {request.employee.department}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {request.endDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {currentlyOnLeave.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    No one is currently on approved leave.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Upcoming approved leave
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Sorted by start date and grouped by department, to help spot
          overlapping absences before they become a scheduling problem.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {approvedFuture.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {request.employee.fullName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {request.employee.department}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {request.startDate.toLocaleDateString()} –{" "}
                    {request.endDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {approvedFuture.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    No upcoming approved leave.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Sick leave
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {sickLeaveRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {request.employee.fullName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {request.startDate.toLocaleDateString()} –{" "}
                    {request.endDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{request.reason}</td>
                  <td className="px-4 py-2 text-slate-600">{request.status}</td>
                </tr>
              ))}
              {sickLeaveRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No sick leave requests on record.
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
