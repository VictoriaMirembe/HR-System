import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { storageProvider } from "@/lib/storage";

// GET /api/documents/[id]/file?mode=preview|download
// "preview" (default) sets Content-Disposition: inline, which browsers
// render PDFs for directly — no separate viewer/library needed. "download"
// sets it to attachment with the original filename.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.DOCUMENT_READ)) {
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

  let buffer: Buffer;
  try {
    buffer = await storageProvider.read(document.storageKey);
  } catch {
    return NextResponse.json({ error: "File is missing from storage." }, { status: 500 });
  }

  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${mode}; filename="${document.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(document.fileSize),
    },
  });
}
