import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BackLink } from "@/components/back-link";
import { EmployeeForm } from "./employee-form";

export default async function NewEmployeePage() {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE)) {
    redirect("/employees");
  }

  const potentialManagers = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true, fullName: true, jobTitle: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink href="/employees" label="Back to employees" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add employee</h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        <p className="mt-3 text-sm text-slate-500">
          Creates a digital record, generates an Employee ID, and emails a
          one-time account setup link to the personal email address.
        </p>
      </div>
      <EmployeeForm potentialManagers={potentialManagers} />
    </div>
  );
}
