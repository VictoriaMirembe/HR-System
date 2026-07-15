import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BackLink } from "@/components/back-link";
import { LeavePlanForm } from "./leave-plan-form";

export default async function LeavePlansPage() {
  const session = await verifySession();

  const currentYear = new Date().getFullYear();

  const planLeaveTypes = await prisma.leaveType.findMany({
    where: { requiresPlan: true },
    orderBy: { name: "asc" },
  });

  const myPlans = await prisma.leavePlan.findMany({
    where: { employeeId: session.employeeId },
    include: { leaveType: { select: { name: true } } },
    orderBy: [{ year: "desc" }, { plannedStartDate: "asc" }],
  });

  const canSeeAll = hasPermission(session, PERMISSIONS.LEAVE_REPORT);

  return (
    <div className="space-y-6">
      <BackLink href="/leave" label="Back to leave" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave plans</h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        <p className="mt-3 text-sm text-slate-500">
          {planLeaveTypes.map((lt) => lt.name).join(" and ")} require a leave
          plan on file for the year before you can submit an actual request.
          Submitting a plan doesn&apos;t use up any balance — it&apos;s just
          your stated intent, so HR and your manager can plan around it.
        </p>
      </div>

      <LeavePlanForm leaveTypes={planLeaveTypes} defaultYear={currentYear} />

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Leave type</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Planned dates</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {myPlans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3 text-slate-900">{plan.leaveType.name}</td>
                <td className="px-4 py-3 text-slate-600">{plan.year}</td>
                <td className="px-4 py-3 text-slate-600">
                  {plan.plannedStartDate.toLocaleDateString()} –{" "}
                  {plan.plannedEndDate.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{plan.notes ?? "—"}</td>
              </tr>
            ))}
            {myPlans.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No leave plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canSeeAll && <AllPlansSection />}
    </div>
  );
}

async function AllPlansSection() {
  const plans = await prisma.leavePlan.findMany({
    include: {
      employee: { select: { fullName: true, department: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { plannedStartDate: "asc" }],
  });

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sky-700">
        All submitted leave plans
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </h2>
      <p className="mt-2 text-xs text-slate-400">
        Everyone&apos;s stated intentions — use this to spot overlapping
        planned absences before they become actual requests.
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Leave type</th>
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Planned dates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-2 text-slate-900">{plan.employee.fullName}</td>
                <td className="px-4 py-2 text-slate-600">{plan.employee.department}</td>
                <td className="px-4 py-2 text-slate-600">{plan.leaveType.name}</td>
                <td className="px-4 py-2 text-slate-600">{plan.year}</td>
                <td className="px-4 py-2 text-slate-600">
                  {plan.plannedStartDate.toLocaleDateString()} –{" "}
                  {plan.plannedEndDate.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No leave plans submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
