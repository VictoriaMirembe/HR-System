import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { countLeaveDays } from "@/lib/leave/days";
import { BackLink } from "@/components/back-link";
import { DecisionButtons } from "./decision-buttons";

export default async function LeaveApprovalsPage() {
  const session = await verifySession();

  const canActAsSupervisor = hasPermission(session, PERMISSIONS.LEAVE_APPROVE_SUPERVISOR);
  const canActAsHr = hasPermission(session, PERMISSIONS.LEAVE_APPROVE_FINAL);
  if (!canActAsSupervisor && !canActAsHr) {
    redirect("/leave");
  }

  const [teamRequests, hrRequests] = await Promise.all([
    canActAsSupervisor
      ? prisma.leaveRequest.findMany({
          where: {
            status: "PENDING_SUPERVISOR",
            employee: { lineManagerId: session.employeeId },
          },
          include: {
            employee: { select: { fullName: true, department: true } },
            leaveType: true,
            delegate: { select: { fullName: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    canActAsHr
      ? prisma.leaveRequest.findMany({
          where: { status: "PENDING_HR" },
          include: {
            employee: { select: { fullName: true, department: true } },
            leaveType: true,
            delegate: { select: { fullName: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/leave" label="Back to leave" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pending approvals</h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </div>

      {canActAsSupervisor && (
        <ApprovalTable
          title="Your team's requests"
          subtitle="Awaiting your sign-off as direct supervisor."
          requests={teamRequests}
        />
      )}

      {canActAsHr && (
        <ApprovalTable
          title="Awaiting HR sign-off"
          subtitle="Approved by the supervisor (or no supervisor on file) — final decision."
          requests={hrRequests}
        />
      )}
    </div>
  );
}

type ApprovalRow = {
  id: number;
  startDate: Date;
  endDate: Date;
  reason: string;
  employee: { fullName: string; department: string };
  leaveType: { name: string };
  delegate: { fullName: string } | null;
};

function ApprovalTable({
  title,
  subtitle,
  requests,
}: {
  title: string;
  subtitle: string;
  requests: ApprovalRow[];
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sky-700">
        {title}
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </h2>
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Leave type</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Delegate</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="px-4 py-2 text-slate-900">
                  {request.employee.fullName}
                  <span className="block text-xs text-slate-400">
                    {request.employee.department}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{request.leaveType.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {request.startDate.toLocaleDateString()} –{" "}
                  {request.endDate.toLocaleDateString()}
                  <span className="block text-xs text-slate-400">
                    {countLeaveDays(request.startDate, request.endDate)} day(s)
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{request.reason}</td>
                <td className="px-4 py-2 text-slate-600">
                  {request.delegate?.fullName ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <DecisionButtons requestId={request.id} />
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nothing pending here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
