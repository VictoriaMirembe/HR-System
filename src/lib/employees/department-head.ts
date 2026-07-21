import type { Prisma } from "@/generated/prisma/client";

// Exactly one department head at a time: call this within the same
// transaction as setting `newHeadEmployeeId`'s isDepartmentHead to true.
// Finds whoever else in `department` currently holds the flag, un-marks
// them, and returns who (so the caller can write an audit log entry for
// that side effect) — or null if nobody else held it.
export async function demoteOtherDepartmentHeads(
  tx: Prisma.TransactionClient,
  department: string,
  newHeadEmployeeId: number
): Promise<{ id: number; fullName: string } | null> {
  const currentHead = await tx.employee.findFirst({
    where: {
      department,
      isDepartmentHead: true,
      id: { not: newHeadEmployeeId },
    },
    select: { id: true, fullName: true },
  });
  if (!currentHead) return null;

  await tx.employee.update({
    where: { id: currentHead.id },
    data: { isDepartmentHead: false },
  });

  return currentHead;
}
