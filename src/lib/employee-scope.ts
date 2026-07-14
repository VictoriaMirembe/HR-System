import type { Prisma } from "@/generated/prisma/client";
import type { SessionPayload } from "@/lib/session";

// Row-level visibility, layered on TOP of the coarse employee:read
// permission check. Every role in the seed data has employee:read (so they
// can at least see themselves), but WHICH rows they see beyond that depends
// on their role, not on a permission flag — that's inherently row-level
// data, not an action gate, so it's expressed as code here rather than as
// more permission rows.
const BROAD_VISIBILITY_ROLES = new Set([
  "HR Administrator",
  "Senior Management",
  "Finance Officer",
]);

export function employeeListWhere(
  session: SessionPayload
): Prisma.EmployeeWhereInput {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) {
    return {};
  }
  if (session.roleName === "Line Manager") {
    return {
      OR: [{ id: session.employeeId }, { lineManagerId: session.employeeId }],
    };
  }
  // Default: employees can only see their own record.
  return { id: session.employeeId };
}

export function canViewEmployee(
  session: SessionPayload,
  target: { id: number; lineManagerId: number | null }
): boolean {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) return true;
  if (session.roleName === "Line Manager") {
    return (
      target.id === session.employeeId ||
      target.lineManagerId === session.employeeId
    );
  }
  return target.id === session.employeeId;
}
