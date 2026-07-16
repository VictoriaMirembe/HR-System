import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logout } from "@/app/actions/auth";
import { getNavItems } from "@/components/nav-items";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true, employeeId: true, profilePictureKey: true },
  });

  const initials = (employee?.fullName ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const canReadAuditLog = hasPermission(session, PERMISSIONS.AUDIT_READ);
  const navItems = getNavItems(canReadAuditLog);

  return (
    <div className="min-h-screen bg-sky-50/40">
      {/* Fixed so it stays visible while scrolling long pages (attendance
          report, audit log, etc). z-40 keeps it above page content but
          below the icon sidebar's hover tooltips (z-50). */}
      <header className="fixed inset-x-0 top-0 z-40 h-14 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset in /public, not remote */}
              <img src="/mci-logo.png" alt="MCI" className="h-8 w-auto" />
              <span className="text-sm font-semibold text-white">
                HR System
              </span>
            </div>
            <nav className="flex gap-5 text-sm font-semibold">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-slate-200 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
              {employee?.profilePictureKey ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
                <img
                  src={`/api/employees/${session.employeeId}/profile-picture`}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-sky-400/30"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30">
                  {initials}
                </span>
              )}
              <span className="hidden flex-col sm:flex">
                <span className="text-slate-200">{employee?.fullName ?? "Unknown"}</span>
                <span className="text-xs text-slate-500">{session.roleName}</span>
              </span>
            </Link>
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

      {/* Icon rail — same links as the top nav, condensed to icons with a
          hover tooltip for the label. `fixed` + top-1/2 + -translate-y-1/2
          centers it vertically in the viewport at all times (not just near
          the top, and not drifting with scroll position like `sticky` top
          offsets do). left-4 is a deliberate small inset from the browser
          edge — enough to not look glued to the margin, without the
          fragile calc() needed to exactly track the centered content
          column's edge. Hidden below md since the top nav's full text
          labels already cover small screens without needing a second,
          redundant nav surface.

          Solid slate-900 (not translucent — tried a glassmorphism version
          here, but the solid color read better), with a thin light border
          and shadow to still sell the "floating panel" feel. */}
      <aside className="fixed top-1/2 left-4 z-30 hidden w-16 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-slate-900 py-4 shadow-xl shadow-slate-900/20 md:flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{item.label}</span>
            <span
              className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition group-hover:opacity-100"
              aria-hidden="true"
            >
              {item.label}
            </span>
          </Link>
        ))}
      </aside>

      {/* pt-14 clears the fixed header; md:pl-24 reserves the icon rail's
          space (left-4 inset + w-16 width + a little breathing room) so
          the centered content below never sits underneath it. */}
      <main className="pt-14 md:pl-24">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
