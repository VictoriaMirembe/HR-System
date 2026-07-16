import type { prisma as PrismaClientInstance } from "@/lib/prisma";

// The AuditLog table stores entityId as a plain string (it has to work
// generically across every entity type), so on its own it's just an
// internal database row number — "Employee #12" means nothing to someone
// who hasn't read the code. This resolves a page's worth of audit entries
// into human labels ("Victoria Mirembe (MCI-2026-0001)") with one batched
// query per entity type actually present on the page, rather than one
// query per row.
export async function resolveEntityLabels(
  prisma: typeof PrismaClientInstance,
  entries: { entity: string; entityId: string }[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const key = (entity: string, entityId: string) => `${entity}:${entityId}`;

  const idsFor = (entity: string) =>
    entries
      .filter((e) => e.entity === entity)
      .map((e) => Number(e.entityId))
      .filter((n) => Number.isInteger(n));

  const employeeIds = idsFor("Employee");
  if (employeeIds.length > 0) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true, employeeId: true },
    });
    for (const e of employees) {
      labels.set(key("Employee", String(e.id)), `${e.fullName} (${e.employeeId})`);
    }
  }

  const leaveRequestIds = idsFor("LeaveRequest");
  if (leaveRequestIds.length > 0) {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { id: { in: leaveRequestIds } },
      include: {
        employee: { select: { fullName: true } },
        leaveType: { select: { name: true } },
      },
    });
    for (const lr of leaveRequests) {
      labels.set(
        key("LeaveRequest", String(lr.id)),
        `${lr.employee.fullName} — ${lr.leaveType.name}`
      );
    }
  }

  const payrollRunIds = idsFor("PayrollRun");
  if (payrollRunIds.length > 0) {
    const payrollRuns = await prisma.payrollRun.findMany({
      where: { id: { in: payrollRunIds } },
      include: { employee: { select: { fullName: true } } },
    });
    for (const run of payrollRuns) {
      labels.set(key("PayrollRun", String(run.id)), `${run.employee.fullName} — ${run.period}`);
    }
  }

  const documentIds = idsFor("Document");
  if (documentIds.length > 0) {
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, title: true },
    });
    for (const doc of documents) {
      labels.set(key("Document", String(doc.id)), doc.title);
    }
  }

  const attendanceIds = idsFor("AttendanceRecord");
  if (attendanceIds.length > 0) {
    const records = await prisma.attendanceRecord.findMany({
      where: { id: { in: attendanceIds } },
      include: { employee: { select: { fullName: true } } },
    });
    for (const record of records) {
      labels.set(
        key("AttendanceRecord", String(record.id)),
        `${record.employee.fullName} — ${record.clockIn.toLocaleDateString()}`
      );
    }
  }

  const userIds = idsFor("User");
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    for (const user of users) {
      labels.set(key("User", String(user.id)), user.email);
    }
  }

  const leavePlanIds = idsFor("LeavePlan");
  if (leavePlanIds.length > 0) {
    const plans = await prisma.leavePlan.findMany({
      where: { id: { in: leavePlanIds } },
      include: {
        employee: { select: { fullName: true } },
        leaveType: { select: { name: true } },
      },
    });
    for (const plan of plans) {
      labels.set(
        key("LeavePlan", String(plan.id)),
        `${plan.employee.fullName} — ${plan.leaveType.name} (${plan.year})`
      );
    }
  }

  // LeaveBalance uses a compound entityId ("employeeId:leaveTypeId"), not
  // a plain row number — see leave-requests/[id]/decide/route.ts.
  const leaveBalanceEntries = entries.filter((e) => e.entity === "LeaveBalance");
  if (leaveBalanceEntries.length > 0) {
    const pairs = leaveBalanceEntries
      .map((e) => {
        const [empIdStr, leaveTypeIdStr] = e.entityId.split(":");
        const empId = Number(empIdStr);
        const leaveTypeId = Number(leaveTypeIdStr);
        return Number.isInteger(empId) && Number.isInteger(leaveTypeId)
          ? { empId, leaveTypeId }
          : null;
      })
      .filter((p) => p !== null);

    const employeeIdsForBalance = [...new Set(pairs.map((p) => p.empId))];
    const leaveTypeIds = [...new Set(pairs.map((p) => p.leaveTypeId))];

    const [balanceEmployees, leaveTypes] = await Promise.all([
      employeeIdsForBalance.length > 0
        ? prisma.employee.findMany({
            where: { id: { in: employeeIdsForBalance } },
            select: { id: true, fullName: true },
          })
        : [],
      leaveTypeIds.length > 0
        ? prisma.leaveType.findMany({
            where: { id: { in: leaveTypeIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const employeeNameById = new Map(balanceEmployees.map((e) => [e.id, e.fullName]));
    const leaveTypeNameById = new Map(leaveTypes.map((lt) => [lt.id, lt.name]));

    for (const { empId, leaveTypeId } of pairs) {
      const employeeName = employeeNameById.get(empId) ?? `Employee #${empId}`;
      const leaveTypeName = leaveTypeNameById.get(leaveTypeId) ?? `Leave type #${leaveTypeId}`;
      labels.set(
        key("LeaveBalance", `${empId}:${leaveTypeId}`),
        `${employeeName} — ${leaveTypeName}`
      );
    }
  }

  return labels;
}
