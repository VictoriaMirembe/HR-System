import type { Prisma } from "@/generated/prisma/client";

// Format: MCI-<year>-<4-digit sequence, per year>, e.g. "MCI-2026-0001".
// Must run inside the same transaction as the Employee insert (`tx`).
//
// Note on concurrency: under Postgres's default READ COMMITTED isolation,
// two simultaneous employee creations could both count the same number of
// existing rows and compute the same next ID. The `employeeId @unique`
// constraint in the schema is the actual backstop here — one of the two
// transactions will fail on insert with a unique violation and should be
// retried by the caller, rather than silently creating a duplicate. For the
// HR-admin-only creation flow in this app, that race is rare enough that a
// DB sequence isn't worth the added complexity, but it's the reason the
// unique constraint exists in addition to this generator.
export async function generateEmployeeId(
  tx: Prisma.TransactionClient,
  now: Date = new Date()
): Promise<string> {
  const year = now.getFullYear();
  const yearPrefix = `MCI-${year}-`;

  const countThisYear = await tx.employee.count({
    where: { employeeId: { startsWith: yearPrefix } },
  });

  const sequence = String(countThisYear + 1).padStart(4, "0");
  return `${yearPrefix}${sequence}`;
}
