import Link from "next/link";
import { Clock } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ClockWidget } from "@/components/clock-widget";
import { PageHeader } from "@/components/page-header";

function formatHours(clockIn: Date, clockOut: Date | null): string {
  if (!clockOut) return "—";
  const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
}

export default async function AttendancePage() {
  const session = await verifySession();

  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId: session.employeeId, clockOut: null },
    select: { id: true, clockIn: true, method: true },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { clockIn: "desc" },
    take: 30,
  });

  const canViewReport = hasPermission(session, PERMISSIONS.ATTENDANCE_REPORT);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        color="amber"
        title="My attendance"
        action={
          canViewReport && (
            <Link
              href="/attendance/report"
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-sm"
            >
              Org-wide report
            </Link>
          )
        }
      />

      <ClockWidget
        initialOpenRecord={
          openRecord
            ? {
                id: openRecord.id,
                clockIn: openRecord.clockIn.toISOString(),
                method: openRecord.method,
              }
            : null
        }
      />

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Clock in</th>
              <th className="px-4 py-3">Clock out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {records.map((record) => (
              <tr key={record.id} className="transition hover:bg-sky-50/50">
                <td className="px-4 py-3 text-slate-900">
                  {record.clockIn.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record.clockIn.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record.clockOut
                    ? record.clockOut.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatHours(record.clockIn, record.clockOut)}
                </td>
                <td className="px-4 py-3 text-slate-600">{record.method}</td>
                <td className="px-4 py-3">
                  {record.isLate ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Late
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      On time
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
