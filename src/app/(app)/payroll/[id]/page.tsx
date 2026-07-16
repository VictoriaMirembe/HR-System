import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { canViewPayrollRun } from "@/lib/payroll-scope";
import { formatMoney } from "@/lib/format-money";
import { BackLink } from "@/components/back-link";
import { AdjustmentForm } from "./adjustment-form";
import { ApprovalButtons } from "./approval-buttons";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  HR_APPROVED: "bg-sky-100 text-sky-700",
  APPROVED_FOR_PAYMENT: "bg-emerald-100 text-emerald-700",
};

export default async function PayslipPage({
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

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, employeeId: true, department: true } },
      adjustments: { orderBy: { createdAt: "asc" } },
      hrApprovedBy: { select: { email: true } },
      financeApprovedBy: { select: { email: true } },
    },
  });
  if (!run) {
    notFound();
  }
  if (!canViewPayrollRun(session, run)) {
    redirect("/payroll");
  }

  const canAdjust = hasPermission(session, PERMISSIONS.PAYROLL_ADJUST);
  const canApproveHr = hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_HR);
  const canApproveFinance = hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_FINANCE);

  const adjustmentsTotal = run.adjustments.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink href="/payroll" label="Back to payroll" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {run.employee.fullName} — {run.period}
          </h1>
          <p className="text-sm text-slate-500">
            {run.employee.employeeId} · {run.employee.department}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[run.status]}`}
        >
          {run.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-sky-700">Breakdown</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Base pay" value={formatMoney(run.basePay)} />
          <Field
            label="Overtime"
            value={`${Number(run.overtimeHours).toFixed(2)}h → ${formatMoney(run.overtimePay)}`}
          />
          <Field label="Gross pay" value={formatMoney(run.grossPay)} />
          <Field
            label="NSSF (employee, 5%)"
            value={`-${formatMoney(run.nssfEmployeeDeduction)}`}
          />
          <Field
            label="NSSF (employer, informational)"
            value={formatMoney(run.nssfEmployerContribution)}
          />
          <Field label="PAYE" value={`-${formatMoney(run.payeDeduction)}`} />
          <Field
            label="Unpaid leave"
            value={`${Number(run.unpaidLeaveDays).toFixed(2)}d → -${formatMoney(run.unpaidLeaveDeduction)}`}
          />
          <Field label="Late days (informational)" value={String(run.lateDaysCount)} />
          <Field label="Deductions" value={formatMoney(run.deductions)} />
          <Field label="Adjustments" value={formatMoney(adjustmentsTotal)} />
          <Field label="Net pay" value={formatMoney(run.netPay)} />
        </dl>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-sky-700">Adjustments</h2>
        <div className="space-y-2">
          {run.adjustments.map((adjustment) => (
            <div
              key={adjustment.id}
              className="flex items-center justify-between rounded-lg border border-sky-50 px-3 py-2 text-sm"
            >
              <span className="text-slate-600">{adjustment.reason}</span>
              <span
                className={
                  Number(adjustment.amount) >= 0 ? "text-emerald-700" : "text-red-700"
                }
              >
                {Number(adjustment.amount) >= 0 ? "+" : ""}
                {formatMoney(adjustment.amount)}
              </span>
            </div>
          ))}
          {run.adjustments.length === 0 && (
            <p className="text-sm text-slate-400">No adjustments.</p>
          )}
        </div>
        {canAdjust && run.status === "DRAFT" && <AdjustmentForm payrollRunId={run.id} />}
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-sky-700">Approval trail</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="HR approved by" value={run.hrApprovedBy?.email ?? "—"} />
          <Field
            label="HR approved at"
            value={run.hrApprovedAt ? run.hrApprovedAt.toLocaleString() : "—"}
          />
          <Field
            label="Finance approved by"
            value={run.financeApprovedBy?.email ?? "—"}
          />
          <Field
            label="Finance approved at"
            value={run.financeApprovedAt ? run.financeApprovedAt.toLocaleString() : "—"}
          />
        </dl>
        <ApprovalButtons
          payrollRunId={run.id}
          status={run.status}
          canApproveHr={canApproveHr}
          canApproveFinance={canApproveFinance}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}
