import type { Prisma } from "@/generated/prisma/client";

type AuditLogInput = {
  actorId: number | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

// Every mutation in the app calls this using the SAME transaction client
// (`tx`) as the mutation itself — see e.g. src/app/api/employees/route.ts.
// Because it's the same transaction, the audit entry and the data change
// commit or roll back together: it's impossible for one to be written
// without the other, which is what "every write produces an audit log
// entry" actually requires in practice, not just in intent.
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditLogInput
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
