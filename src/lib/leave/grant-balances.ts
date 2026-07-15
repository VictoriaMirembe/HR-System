import type { Prisma, $Enums } from "@/generated/prisma/client";

// Shared by employee creation and employee updates: grants a LeaveBalance
// row for every tracked leave type the employee is eligible for and
// doesn't already have one for. Additive only — it never removes a balance
// an employee already has, even if their gender is later corrected and a
// type they previously qualified for no longer applies. That's a
// deliberate choice: don't destroy historical balance data on a profile
// correction, only grant what's newly eligible.
export async function grantEligibleLeaveBalances(
  tx: Prisma.TransactionClient,
  employeeId: number,
  gender: $Enums.Gender | null
): Promise<void> {
  const trackedLeaveTypes = await tx.leaveType.findMany({
    where: { tracksBalance: true },
  });
  const eligibleLeaveTypes = trackedLeaveTypes.filter(
    (leaveType) => !leaveType.restrictedToGender || leaveType.restrictedToGender === gender
  );

  const existingBalances = await tx.leaveBalance.findMany({
    where: { employeeId, leaveTypeId: { in: eligibleLeaveTypes.map((lt) => lt.id) } },
    select: { leaveTypeId: true },
  });
  const existingLeaveTypeIds = new Set(existingBalances.map((b) => b.leaveTypeId));

  const missing = eligibleLeaveTypes.filter((lt) => !existingLeaveTypeIds.has(lt.id));
  if (missing.length === 0) return;

  await tx.leaveBalance.createMany({
    data: missing.map((leaveType) => ({
      employeeId,
      leaveTypeId: leaveType.id,
      remainingDays: leaveType.defaultAnnualDays,
    })),
  });
}
