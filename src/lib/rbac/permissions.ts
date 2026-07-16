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
  EMPLOYEE_UPDATE_OWN: "employee:update:own",
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
  PAYROLL_GENERATE: "payroll:generate",
  PAYROLL_READ: "payroll:read",
  PAYROLL_ADJUST: "payroll:adjust",
  PAYROLL_APPROVE_HR: "payroll:approve:hr",
  PAYROLL_APPROVE_FINANCE: "payroll:approve:finance",
  PAYROLL_REPORT: "payroll:report",
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_READ: "document:read",
  DOCUMENT_MANAGE: "document:manage",
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
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
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
    PERMISSIONS.PAYROLL_GENERATE,
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.PAYROLL_ADJUST,
    PERMISSIONS.PAYROLL_APPROVE_HR,
    PERMISSIONS.PAYROLL_REPORT,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_MANAGE,
  ],
  "Senior Management": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
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
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.PAYROLL_REPORT,
    PERMISSIONS.DOCUMENT_READ,
  ],
  "Finance Officer": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.PAYROLL_APPROVE_FINANCE,
    PERMISSIONS.PAYROLL_REPORT,
    PERMISSIONS.DOCUMENT_READ,
  ],
  "Line Manager": [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.LEAVE_APPROVE_SUPERVISOR,
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.DOCUMENT_READ,
  ],
  Employee: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.LEAVE_PLAN,
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.DOCUMENT_READ,
  ],
};
