import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BackLink } from "@/components/back-link";
import { EditEmployeeForm } from "./edit-employee-form";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE)) {
    redirect("/employees");
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    notFound();
  }

  const potentialManagers = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", id: { not: id } },
    select: { id: true, fullName: true, jobTitle: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink href={`/employees/${employee.id}`} label="Back to employee" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Edit {employee.fullName}
        </h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </div>
      <EditEmployeeForm
        employeeId={employee.id}
        potentialManagers={potentialManagers}
        initialValues={{
          fullName: employee.fullName,
          personalEmail: employee.personalEmail,
          workEmail: employee.workEmail,
          dateOfBirth: toDateInputValue(employee.dateOfBirth),
          gender: employee.gender ?? "",
          jobTitle: employee.jobTitle,
          department: employee.department,
          lineManagerId: employee.lineManagerId,
          startDate: toDateInputValue(employee.startDate),
          salary: employee.salary.toString(),
          bankName: employee.bankName,
          bankAccountNumber: employee.bankAccountNumber,
          tin: employee.tin,
          nssfNumber: employee.nssfNumber,
          contractType: employee.contractType,
          contractStart: toDateInputValue(employee.contractStart),
          contractEnd: employee.contractEnd ? toDateInputValue(employee.contractEnd) : "",
        }}
      />
    </div>
  );
}
