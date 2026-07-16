import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { documentMetadataSchema } from "@/lib/validation/document";
import { ALLOWED_MIME_TYPE, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/documents/config";
import { generateDocumentStorageKey } from "@/lib/documents/storage-key";
import { storageProvider } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

// GET /api/documents?search= — everyone with document:read. Search is a
// simple case-insensitive title match, per the acceptance criteria
// ("employees can search documents by title").
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.DOCUMENT_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim();

  const documents = await prisma.document.findMany({
    where: search ? { title: { contains: search, mode: "insensitive" } } : {},
    select: {
      id: true,
      title: true,
      category: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      uploadedBy: { select: { email: true } },
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ documents });
}

// POST /api/documents — HR-only. Multipart form: title, category, file
// (PDF only, per the acceptance criteria). Saves the file via the
// StorageProvider abstraction, then creates the Document row and audit
// log entry — not in a single DB transaction with the file write (a
// filesystem write can't participate in a Postgres transaction), but if
// the DB insert fails after a successful file write, the file is cleaned
// up so it doesn't become orphaned.
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.DOCUMENT_UPLOAD)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const parsed = documentMetadataSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  if (file.type !== ALLOWED_MIME_TYPE) {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit.` },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const storageKey = generateDocumentStorageKey(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await storageProvider.save(storageKey, buffer);

  try {
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          title: parsed.data.title,
          category: parsed.data.category,
          fileName: file.name,
          storageKey,
          mimeType: file.type,
          fileSize: file.size,
          uploadedById: session.userId,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName: actor?.fullName ?? "Unknown",
        action: "document.upload",
        entity: "Document",
        entityId: String(created.id),
        metadata: { title: created.title, category: created.category },
      });

      return created;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    // DB insert failed after the file was already written — don't leave an
    // orphaned file behind with nothing pointing to it.
    await storageProvider.delete(storageKey).catch(() => {});
    throw error;
  }
}
