import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export default async function DashboardPage() {
  const session = await verifySession();

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    select: {
      fullName: true,
      employeeId: true,
      jobTitle: true,
      department: true,
      workEmail: true,
      startDate: true,
    },
  });

  const canCreateEmployees = hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {employee.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          {employee.jobTitle} · {employee.department}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Employee ID" value={employee.employeeId} />
        <StatCard label="Role" value={session.roleName} />
        <StatCard
          label="Start date"
          value={employee.startDate.toLocaleDateString()}
        />
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Quick actions
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/employees"
            className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
          >
            View employee directory
          </Link>
          {canCreateEmployees && (
            <Link
              href="/employees/new"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500"
            >
              Add new employee
            </Link>
          )}
        </div>
        <p className="mt-5 text-xs text-slate-400">
          Leave, timesheet, and payroll widgets land here once those modules
          are built (this dashboard is intentionally minimal for now — see
          the Employee Self-Service Portal feature later in the build order).
        </p>
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
