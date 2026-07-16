import Link from "next/link";
import { Wallet } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { formatMoney } from "@/lib/format-money";
import { PageHeader } from "@/components/page-header";
import { GeneratePayrollForm } from "./generate-payroll-form";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  HR_APPROVED: "bg-sky-100 text-sky-700",
  APPROVED_FOR_PAYMENT: "bg-emerald-100 text-emerald-700",
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await verifySession();
  const { period: periodParam } = await searchParams;
  const period = periodParam || currentPeriod();

  const canGenerate = hasPermission(session, PERMISSIONS.PAYROLL_GENERATE);
  const canApproveHr = hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_HR);
  const canApproveFinance = hasPermission(session, PERMISSIONS.PAYROLL_APPROVE_FINANCE);
  const canReport = hasPermission(session, PERMISSIONS.PAYROLL_REPORT);
  const canSeeAll = canApproveHr || canApproveFinance || canReport;

  const myRuns = await prisma.payrollRun.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { period: "desc" },
  });

  const periodRuns = canSeeAll
    ? await prisma.payrollRun.findMany({
        where: { period },
        include: { employee: { select: { fullName: true, department: true } } },
        orderBy: { employee: { fullName: "asc" } },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        color="violet"
        title="Payroll"
        action={
          canReport && (
            <form
              method="GET"
              action="/api/payroll/report"
              className="flex items-center gap-2"
            >
              <input type="hidden" name="period" value={period} />
              <button
                type="submit"
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-sm"
              >
                Download {period} CSV
              </button>
            </form>
          )
        }
      />

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          My payslips
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
          <table className="min-w-full divide-y divide-sky-100 text-sm">
            <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
              <tr>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Net pay</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {myRuns.map((run) => (
                <tr key={run.id} className="transition hover:bg-sky-50/50">
                  <td className="px-4 py-2 text-slate-900">{run.period}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatMoney(run.netPay)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[run.status]}`}
                    >
                      {run.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/payroll/${run.id}`}
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      View payslip
                    </Link>
                  </td>
                </tr>
              ))}
              {myRuns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No payslips yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canSeeAll && (
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sky-700">
              {period} — all employees
              <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
            </h2>
            <form method="GET" className="flex items-center gap-2">
              <input
                type="month"
                name="period"
                defaultValue={period}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
              <button
                type="submit"
                className="rounded-full border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
              >
                Go
              </button>
            </form>
          </div>

          {canGenerate && <GeneratePayrollForm period={period} />}

          <div className="mt-4 overflow-hidden rounded-xl border border-sky-50">
            <table className="min-w-full divide-y divide-sky-100 text-sm">
              <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Gross</th>
                  <th className="px-4 py-2">Net</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {periodRuns.map((run) => (
                  <tr key={run.id} className="transition hover:bg-sky-50/50">
                    <td className="px-4 py-2 text-slate-900">{run.employee.fullName}</td>
                    <td className="px-4 py-2 text-slate-600">{run.employee.department}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatMoney(run.grossPay)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatMoney(run.netPay)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[run.status]}`}
                      >
                        {run.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/payroll/${run.id}`}
                        className="text-sm font-medium text-sky-700 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
                {periodRuns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      No payroll runs for {period} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
