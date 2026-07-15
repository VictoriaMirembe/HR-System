import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true, employeeId: true },
  });

  const initials = (employee?.fullName ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-sky-50/40">
      <header className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300 ring-1 ring-sky-400/40">
                MCI
              </span>
              <span className="text-sm font-semibold text-white">
                HR System
              </span>
            </div>
            <nav className="flex gap-5 text-sm">
              <Link
                href="/dashboard"
                className="text-slate-300 transition hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/employees"
                className="text-slate-300 transition hover:text-white"
              >
                Employees
              </Link>
              <Link
                href="/attendance"
                className="text-slate-300 transition hover:text-white"
              >
                Attendance
              </Link>
              <Link
                href="/leave"
                className="text-slate-300 transition hover:text-white"
              >
                Leave
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30">
                {initials}
              </span>
              <span className="text-slate-300">
                {employee?.fullName ?? "Unknown"}{" "}
                <span className="text-slate-500">· {session.roleName}</span>
              </span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
