import Link from "next/link";
import {
  IdCard,
  ShieldCheck,
  CalendarDays,
  Clock,
  Users,
  Wallet,
  UserCog,
  FileText,
  ArrowRight,
} from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ClockWidget } from "@/components/clock-widget";
import { ORG_TIMEZONE } from "@/lib/attendance/config";
import { getTimeInTimeZone } from "@/lib/attendance/timezone";
import { greetingForHour } from "@/lib/greeting";

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
      contractEnd: true,
      nextAppraisalDate: true,
    },
  });

  const greeting = greetingForHour(
    getTimeInTimeZone(new Date(), ORG_TIMEZONE).hours
  );

  // Alert threshold: within the next 60 days. A round number, not a
  // requirement given by the spec — easy to tune if HR wants a different
  // lead time.
  const ALERT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const contractExpiringSoon =
    employee.contractEnd && employee.contractEnd.getTime() - now <= ALERT_WINDOW_MS
      ? employee.contractEnd
      : null;
  const appraisalUpcoming =
    employee.nextAppraisalDate && employee.nextAppraisalDate.getTime() - now <= ALERT_WINDOW_MS
      ? employee.nextAppraisalDate
      : null;

  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId: session.employeeId, clockOut: null },
    select: { id: true, clockIn: true, method: true },
  });

  const annualLeaveBalance = await prisma.leaveBalance.findFirst({
    where: { employeeId: session.employeeId, leaveType: { name: "Annual Leave" } },
  });
  const pendingLeaveCount = await prisma.leaveRequest.count({
    where: {
      employeeId: session.employeeId,
      status: { in: ["PENDING_SUPERVISOR", "PENDING_HR"] },
    },
  });

  const canCreateEmployees = hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE);

  const recentDocuments = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, category: true },
  });

  return (
    <div className="space-y-8">
      {/* Hero — same navy gradient as the top nav/login screens for brand
          consistency, with soft color blooms (sky + the logo's orange) for
          visual energy rather than a flat block of navy. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-8 shadow-lg shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-sky-300">{greeting},</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            {employee.fullName.split(" ")[0]}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
              {employee.jobTitle}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
              {employee.department}
            </span>
          </div>
        </div>
      </div>

      {(contractExpiringSoon || appraisalUpcoming) && (
        <div className="space-y-2">
          {contractExpiringSoon && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Your contract ends on{" "}
              <strong>{contractExpiringSoon.toLocaleDateString()}</strong>. Contact
              HR if you have questions about renewal.
            </div>
          )}
          {appraisalUpcoming && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Your next appraisal is scheduled for{" "}
              <strong>{appraisalUpcoming.toLocaleDateString()}</strong>.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={IdCard}
          color="sky"
          label="Employee ID"
          value={employee.employeeId}
        />
        <StatCard
          icon={ShieldCheck}
          color="violet"
          label="Role"
          value={session.roleName}
        />
        <StatCard
          icon={CalendarDays}
          color="emerald"
          label="Annual leave remaining"
          value={
            annualLeaveBalance ? `${Number(annualLeaveBalance.remainingDays)} days` : "—"
          }
        />
        <StatCard
          icon={Clock}
          color="amber"
          label="Pending leave requests"
          value={String(pendingLeaveCount)}
        />
      </div>

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

      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">
          Quick actions
          <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickAction href="/employees" icon={Users} label="View employee directory" />
          <QuickAction href="/attendance" icon={Clock} label="View my attendance" />
          <QuickAction href="/leave/new" icon={CalendarDays} label="Request leave" />
          <QuickAction href="/payroll" icon={Wallet} label="View my payslips" />
          <QuickAction href="/profile" icon={UserCog} label="Edit my profile" />
          {canCreateEmployees && (
            <Link
              href="/employees/new"
              className="group flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Add new employee
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sky-700">
            Documents
            <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
          </h2>
          <Link
            href="/documents"
            className="group flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {recentDocuments.map((document) => (
            <li key={document.id}>
              <a
                href={`/api/documents/${document.id}/file?mode=preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-sm text-slate-700 hover:text-sky-700"
              >
                <FileText className="h-4 w-4 text-slate-400 transition group-hover:text-sky-500" aria-hidden="true" />
                <span className="group-hover:underline">{document.title}</span>
                <span className="text-xs text-slate-400">{document.category}</span>
              </a>
            </li>
          ))}
          {recentDocuments.length === 0 && (
            <p className="text-sm text-slate-400">No documents uploaded yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
}

const STAT_COLOR_STYLES = {
  sky: { bg: "bg-sky-50", ring: "ring-sky-100", icon: "text-sky-600", label: "text-sky-600/70" },
  violet: {
    bg: "bg-violet-50",
    ring: "ring-violet-100",
    icon: "text-violet-600",
    label: "text-violet-600/70",
  },
  emerald: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    icon: "text-emerald-600",
    label: "text-emerald-600/70",
  },
  amber: {
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    icon: "text-amber-600",
    label: "text-amber-600/70",
  },
} as const;

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof STAT_COLOR_STYLES;
  label: string;
  value: string;
}) {
  const styles = STAT_COLOR_STYLES[color];
  return (
    <div className="group rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles.bg} ring-1 ${styles.ring}`}
      >
        <Icon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
      </div>
      <p className={`mt-3 text-xs font-medium uppercase tracking-wide ${styles.label}`}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-sm"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
