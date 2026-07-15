// Central catalog of permission keys used across the app. This file is the
// only place a permission key is spelled out as a string literal — route
// handlers and UI checks import PERMISSIONS.X instead of typing "employee:read"
// by hand, so a typo becomes a TypeScript error instead of a silent bug.
//
// The catalog only lists permissions actually enforced by code that exists
// today. Later features add their own keys here as they're built, and seed
// the Role ↔ Permission rows in prisma/seed.ts — no changes to this file's
// *shape* are needed, and no changes to auth/session code are ever needed
// to add a role.
export const PERMISSIONS = {
  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_READ: "employee:read",
  EMPLOYEE_UPDATE: "employee:update",
  EMPLOYEE_ARCHIVE: "employee:archive",
  AUDIT_READ: "audit:read",
  ATTENDANCE_CLOCK: "attendance:clock",
  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_REPORT: "attendance:report",
  LEAVE_REQUEST: "leave:request",
  LEAVE_READ: "leave:read",
  LEAVE_PLAN: "leave:plan",
  LEAVE_APPROVE_SUPERVISOR: "leave:approve:supervisor",
  LEAVE_APPROVE_FINAL: "leave:approve:final",
  LEAVE_REPORT: "leave:report",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Seed-time mapping of role name -> permission keys. This is the ONE place
// role/permission assignments are declared; prisma/seed.ts writes it into
// the Role and Permission tables. To add a new role, add an entry here and
// re-run the seed (or, in production, do the equivalent as a data change) —
// no application code changes needed.
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "HR Administrator": [
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_ARCHIVE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_REPORT,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.LEAVE_APPROVE_SUPERVISOR,
    PERMISSIONS.LEAVE_APPROVE_FINAL,
    PERMISSIONS.LEAVE_REPORT,
  ],
  "Senior Management": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_REPORT,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.LEAVE_APPROVE_SUPERVISOR,
    PERMISSIONS.LEAVE_APPROVE_FINAL,
    PERMISSIONS.LEAVE_REPORT,
  ],
  "Finance Officer": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
  ],
  "Line Manager": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.LEAVE_APPROVE_SUPERVISOR,
  ],
  Employee: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
  ],
};
