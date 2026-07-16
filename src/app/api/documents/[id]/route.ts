import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { storageProvider } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

// DELETE /api/documents/[id] — HR-only. Removes the DB row first (inside
// the audit-logged transaction, so the log entry is guaranteed to exist),
// then the underlying file — the reverse order of creation, so a failure
// partway through never leaves a Document row pointing at a deleted file.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.DOCUMENT_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.document.delete({ where: { id } });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "document.delete",
      entity: "Document",
      entityId: String(id),
      metadata: { title: document.title },
    });
  });

  await storageProvider.delete(document.storageKey).catch(() => {});

  return NextResponse.json({ success: true });
}
