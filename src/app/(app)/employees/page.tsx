import Link from "next/link";
import { Users } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { employeeListWhere } from "@/lib/employee-scope";
import { departmentValues } from "@/lib/validation/employee";
import { PageHeader } from "@/components/page-header";
import type { Prisma } from "@/generated/prisma/client";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; department?: string; status?: string }>;
}) {
  const session = await verifySession();
  const { search, department, status } = await searchParams;

  const canCreate = hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE);

  const where: Prisma.EmployeeWhereInput = {
    ...employeeListWhere(session),
    ...(department ? { department } : {}),
    ...(status === "ACTIVE" || status === "ARCHIVED"
      ? { employmentStatus: status }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
            { workEmail: { contains: search, mode: "insensitive" } },
            { jobTitle: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      jobTitle: true,
      department: true,
      workEmail: true,
      employmentStatus: true,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        color="sky"
        title="Employees"
        action={
          canCreate && (
            <Link
              href="/employees/new"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md"
            >
              Add employee
            </Link>
          )
        }
      />

      <form className="flex flex-wrap gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search name, ID, email, title..."
          className="min-w-[220px] flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <select
          name="department"
          defaultValue={department ?? ""}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          <option value="">All departments</option>
          {departmentValues.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          type="submit"
          className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Job Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {employees.map((employee) => (
              <tr key={employee.id} className="transition hover:bg-sky-50/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {employee.employeeId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-900">{employee.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{employee.jobTitle}</td>
                <td className="px-4 py-3 text-slate-600">{employee.department}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      employee.employmentStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {employee.employmentStatus}
                  </span>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
