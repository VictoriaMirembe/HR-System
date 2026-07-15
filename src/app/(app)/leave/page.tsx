import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const STATUS_LABEL: Record<string, string> = {
  PENDING_SUPERVISOR: "Pending supervisor",
  PENDING_HR: "Pending HR",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_SUPERVISOR: "bg-amber-100 text-amber-700",
  PENDING_HR: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default async function LeavePage() {
  const session = await verifySession();

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: session.employeeId },
    include: { leaveType: true },
    orderBy: { leaveType: { name: "asc" } },
  });

  const myRequests = await prisma.leaveRequest.findMany({
    where: { employeeId: session.employeeId },
    include: { leaveType: true, delegate: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const canApprove =
    hasPermission(session, PERMISSIONS.LEAVE_APPROVE_SUPERVISOR) ||
    hasPermission(session, PERMISSIONS.LEAVE_APPROVE_FINAL);
  const canReport = hasPermission(session, PERMISSIONS.LEAVE_REPORT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My leave</h1>
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </div>
        <div className="flex gap-3">
          {canApprove && (
            <Link
              href="/leave/approvals"
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
            >
              Pending approvals
            </Link>
          )}
          {canReport && (
            <Link
              href="/leave/report"
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
            >
              Leave report
            </Link>
          )}
          <Link
            href="/leave/new"
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500"
          >
            Request leave
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => (
          <div
            key={balance.id}
            className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-sky-600/70">
              {balance.leaveType.name}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {Number(balance.remainingDays)} days remaining
            </p>
          </div>
        ))}
        {balances.length === 0 && (
          <p className="text-sm text-slate-400">No tracked leave balances yet.</p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Leave type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Delegate</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {myRequests.map((leaveRequest) => (
              <tr key={leaveRequest.id}>
                <td className="px-4 py-3 text-slate-900">
                  {leaveRequest.leaveType.name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {leaveRequest.startDate.toLocaleDateString()} –{" "}
                  {leaveRequest.endDate.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {leaveRequest.reason}
                  {leaveRequest.status === "DECLINED" && leaveRequest.decisionReason && (
                    <span className="mt-1 block text-xs text-red-600">
                      Declined: {leaveRequest.decisionReason}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {leaveRequest.delegate?.fullName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[leaveRequest.status]}`}
                  >
                    {STATUS_LABEL[leaveRequest.status]}
                  </span>
                </td>
              </tr>
            ))}
            {myRequests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No leave requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
