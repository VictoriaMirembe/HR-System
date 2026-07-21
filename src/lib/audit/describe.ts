// Turns an audit log entry's (action, metadata) pair into a plain-English
// sentence for the Audit Log page — the raw metadata JSON is accurate but
// meaningless to anyone who hasn't read the code that wrote it. Pure
// function: no DB access, just string formatting, so it's cheaply testable
// and can't drift silently (a new action added elsewhere without updating
// this file just falls through to the generic fallback, which stays
// truthful even if not pretty).

type Metadata = Record<string, unknown> | null | undefined;

function field(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return value === undefined || value === null ? undefined : String(value);
}

function fieldList(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.map(String).join(", ") : undefined;
}

// Human-friendly label for the action badge (e.g. "employee.create" ->
// "Employee created"). Falls back to a generic "dot.notation" -> "Dot
// notation" transform for any action not explicitly listed, so a new
// action added later still renders as something readable by default.
const ACTION_LABELS: Record<string, string> = {
  "employee.create": "Employee created",
  "employee.update": "Employee updated (HR)",
  "employee.self_update": "Profile self-updated",
  "employee.archive": "Employee archived",
  "employee.profile_picture_update": "Profile picture updated",
  "user.role_changed": "System role changed",
  "attendance.clock_in": "Clocked in",
  "attendance.clock_out": "Clocked out",
  "leave.request_submitted": "Leave requested",
  "leave.approve_supervisor": "Leave approved (supervisor)",
  "leave.decline_supervisor": "Leave declined (supervisor)",
  "leave.approve_final": "Leave approved (HR)",
  "leave.decline_final": "Leave declined (HR)",
  "leave.balance_adjusted": "Leave balance adjusted",
  "leave_plan.submit": "Leave plan submitted",
  "payroll.run_generated": "Payroll generated",
  "payroll.run_recalculated": "Payroll recalculated",
  "payroll.adjustment_added": "Payroll adjustment added",
  "payroll.approved_hr": "Payroll approved (HR)",
  "payroll.approved_finance": "Payroll approved for payment",
  "document.upload": "Document uploaded",
  "document.delete": "Document deleted",
  "auth.login": "Signed in",
  "auth.setup_completed": "Account setup completed",
  "auth.password_changed": "Password changed",
  "auth.account_locked": "Account locked (too many failed logins)",
};

export function describeActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const spaced = action.replace(/[._]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function describeAuditEntry(action: string, metadata: Metadata): string {
  switch (action) {
    case "employee.create": {
      const employeeId = field(metadata, "employeeId") ?? "assigned";
      const roleName = field(metadata, "roleName");
      return roleName
        ? `Employee ID ${employeeId}. System role: ${roleName}.`
        : `Employee ID ${employeeId}.`;
    }
    case "user.role_changed": {
      const from = field(metadata, "fromRole");
      const to = field(metadata, "toRole");
      return `Role changed from ${from ?? "?"} to ${to ?? "?"}.`;
    }
    case "employee.update": {
      const fields = fieldList(metadata, "fields");
      return fields ? `Changed: ${fields}.` : "Employee record updated.";
    }
    case "employee.self_update": {
      const fields = fieldList(metadata, "fields");
      return fields ? `Employee updated their own: ${fields}.` : "Profile updated.";
    }
    case "employee.archive":
      return "Marked inactive and archived (not deleted).";
    case "employee.profile_picture_update":
      return "New profile picture uploaded.";
    case "attendance.clock_in": {
      const method = field(metadata, "method");
      const late = metadata?.isLate === true;
      return `Method: ${method ?? "unknown"}.${late ? " Flagged late." : ""}`;
    }
    case "attendance.clock_out":
      return "Ended their shift.";
    case "leave.request_submitted": {
      const type = field(metadata, "leaveType");
      const days = field(metadata, "days");
      return `${type ?? "Leave"} — ${days ?? "?"} day(s) requested.`;
    }
    case "leave.approve_supervisor":
      return "Approved by direct supervisor — forwarded to HR for final sign-off.";
    case "leave.decline_supervisor":
      return `Declined by supervisor. Reason: ${field(metadata, "reason") ?? "not given"}.`;
    case "leave.approve_final":
      return "Approved by HR — leave is confirmed and balance deducted.";
    case "leave.decline_final":
      return `Declined by HR. Reason: ${field(metadata, "reason") ?? "not given"}.`;
    case "leave.balance_adjusted": {
      const deducted = field(metadata, "daysDeducted");
      const before = field(metadata, "before");
      const after = field(metadata, "after");
      return `-${deducted ?? "?"} day(s) (${before ?? "?"} → ${after ?? "?"} remaining).`;
    }
    case "leave_plan.submit": {
      const type = field(metadata, "leaveType");
      const year = field(metadata, "year");
      return `${type ?? "Leave"} plan for ${year ?? "?"}.`;
    }
    case "payroll.run_generated":
    case "payroll.run_recalculated": {
      const period = field(metadata, "period");
      return `Period: ${period ?? "?"}.`;
    }
    case "payroll.adjustment_added": {
      const amount = field(metadata, "amount");
      const reason = field(metadata, "reason");
      return `${amount ?? "?"} — ${reason ?? "no reason given"}.`;
    }
    case "payroll.approved_hr":
      return "HR sign-off recorded — awaiting Finance.";
    case "payroll.approved_finance":
      return "Finance sign-off recorded — marked approved for payment (no real money moved).";
    case "document.upload": {
      const title = field(metadata, "title");
      const category = field(metadata, "category");
      return `"${title ?? "Untitled"}" (${category ?? "uncategorized"}).`;
    }
    case "document.delete":
      return `"${field(metadata, "title") ?? "Untitled"}" removed.`;
    case "auth.login":
      return "Logged into the system.";
    case "auth.setup_completed":
      return "Completed one-time account setup and chose a password.";
    case "auth.password_changed":
      return "Changed their own account password.";
    case "auth.account_locked": {
      const attempts = field(metadata, "failedAttempts");
      return `Locked for 15 minutes after ${attempts ?? "too many"} failed login attempts.`;
    }
    default:
      return metadata ? JSON.stringify(metadata) : "No further detail recorded.";
  }
}
