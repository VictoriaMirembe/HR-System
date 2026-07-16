import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { canViewEmployee } from "@/lib/employee-scope";
import { formatMoney } from "@/lib/format-money";
import { BackLink } from "@/components/back-link";
import { ArchiveButton } from "./archive-button";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      lineManager: { select: { id: true, fullName: true } },
      user: { select: { role: { select: { name: true } } } },
    },
  });
  if (!employee) {
    notFound();
  }
  if (!canViewEmployee(session, employee)) {
    redirect("/employees");
  }

  const canArchive = hasPermission(session, PERMISSIONS.EMPLOYEE_ARCHIVE);
  const canEdit = hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/employees" label="Back to employees" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {employee.profilePictureKey ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
            <img
              src={`/api/employees/${employee.id}/profile-picture`}
              alt=""
              className="h-14 w-14 rounded-full object-cover ring-1 ring-sky-100"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-600">
              {employee.fullName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {employee.fullName}
            </h1>
            <p className="text-sm text-slate-500">
              {employee.employeeId} · {employee.jobTitle} · {employee.department}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              employee.employmentStatus === "ACTIVE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {employee.employmentStatus}
          </span>
          {canEdit && (
            <Link
              href={`/employees/${employee.id}/edit`}
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <Section title="Personal">
        <Field label="Personal email" value={employee.personalEmail} />
        <Field label="Work email" value={employee.workEmail} />
        <Field
          label="Date of birth"
          value={employee.dateOfBirth.toLocaleDateString()}
        />
        <Field label="Gender" value={employee.gender ?? "Not specified"} />
      </Section>

      <Section title="Job">
        <Field label="Job title" value={employee.jobTitle} />
        <Field label="Department" value={employee.department} />
        <Field
          label="Line manager"
          value={employee.lineManager?.fullName ?? "—"}
        />
        <Field label="Start date" value={employee.startDate.toLocaleDateString()} />
        <Field
          label="Next appraisal"
          value={employee.nextAppraisalDate?.toLocaleDateString() ?? "—"}
        />
      </Section>

      {canEdit && (
        <Section title="Account & access">
          <Field label="System role" value={employee.user?.role.name ?? "—"} />
        </Section>
      )}

      <Section title="Contract">
        <Field label="Contract type" value={employee.contractType} />
        <Field
          label="Contract start"
          value={employee.contractStart.toLocaleDateString()}
        />
        <Field
          label="Contract end"
          value={employee.contractEnd?.toLocaleDateString() ?? "—"}
        />
      </Section>

      <Section title="Payroll (sensitive)">
        <Field label="Salary" value={formatMoney(employee.salary)} />
        <Field label="Bank name" value={employee.bankName} />
        <Field label="Bank account" value={employee.bankAccountNumber} />
        <Field label="TIN" value={employee.tin} />
        <Field label="NSSF number" value={employee.nssfNumber} />
      </Section>

      {canEdit && (
        <Section title="Next of kin (sensitive)">
          <Field label="Full name" value={employee.nextOfKinName ?? "—"} />
          <Field
            label="Relationship"
            value={employee.nextOfKinRelationship ?? "—"}
          />
          <Field label="Phone number" value={employee.nextOfKinPhone ?? "—"} />
        </Section>
      )}

      {canEdit && (
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-sky-700">
            Health (sensitive)
          </h2>
          <p className="text-sm text-slate-900">
            {employee.healthStatus ?? "Not recorded."}
          </p>
        </div>
      )}

      {canArchive && employee.employmentStatus === "ACTIVE" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Offboarding marks this employee inactive and archives their
            records for the retention period. This does not delete data.
          </p>
          <ArchiveButton employeeId={employee.id} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-sky-700">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}
