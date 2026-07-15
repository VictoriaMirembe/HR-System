import type { Prisma } from "@/generated/prisma/client";
import type { SessionPayload } from "@/lib/session";

// Same reasoning as src/lib/employee-scope.ts: leave:read is granted to
// every role (everyone can see their own requests), but WHICH rows beyond
// "your own" depends on the role, which is row-level data rather than a
// coarse permission flag.
const BROAD_VISIBILITY_ROLES = new Set(["HR Administrator", "Senior Management"]);

export function leaveRequestListWhere(
  session: SessionPayload
): Prisma.LeaveRequestWhereInput {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) {
    return {};
  }
  if (session.roleName === "Line Manager") {
    return {
      OR: [
        { employeeId: session.employeeId },
        { employee: { lineManagerId: session.employeeId } },
      ],
    };
  }
  return { employeeId: session.employeeId };
}

export function canViewLeaveRequest(
  session: SessionPayload,
  request: { employeeId: number; employee: { lineManagerId: number | null } }
): boolean {
  if (BROAD_VISIBILITY_ROLES.has(session.roleName)) return true;
  if (session.roleName === "Line Manager") {
    return (
      request.employeeId === session.employeeId ||
      request.employee.lineManagerId === session.employeeId
    );
  }
  return request.employeeId === session.employeeId;
}
