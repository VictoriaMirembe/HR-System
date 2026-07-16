import type { Prisma } from "@/generated/prisma/client";
import type { SessionPayload } from "@/lib/session";

// Same reasoning as employee-scope.ts / leave-scope.ts: payroll:read is
// granted to every role (everyone can see their own payslips), but HR,
// Finance, and Senior Management additionally see everyone's — that's
// row-level visibility, not a coarse permission flag.
const BROAD_VISIBILITY_ROLES = new Set([
  "HR Administrator",
  "Finance Officer",
  "Senior Management",
]);

export function payrollRunListWhere(
  session: SessionPayload
): Prisma.PayrollRunWhereInput {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) {
    return {};
  }
  return { employeeId: session.employeeId };
}

export function canViewPayrollRun(
  session: SessionPayload,
  run: { employeeId: number }
): boolean {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) return true;
  return run.employeeId === session.employeeId;
}
