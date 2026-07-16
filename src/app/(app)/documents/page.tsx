import Link from "next/link";
import { FileText } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "./delete-button";

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await verifySession();
  const { search } = await searchParams;

  const canUpload = hasPermission(session, PERMISSIONS.DOCUMENT_UPLOAD);
  const canManage = hasPermission(session, PERMISSIONS.DOCUMENT_MANAGE);

  const documents = await prisma.document.findMany({
    where: search ? { title: { contains: search, mode: "insensitive" } } : {},
    include: { uploadedBy: { select: { email: true } } },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        color="rose"
        title="Documents"
        action={
          canUpload && (
            <Link
              href="/documents/new"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md"
            >
              Upload document
            </Link>
          )
        }
      />

      <form className="flex gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by title..."
          className="min-w-[220px] flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <button
          type="submit"
          className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {documents.map((document) => (
              <tr key={document.id} className="transition hover:bg-sky-50/50">
                <td className="px-4 py-3 text-slate-900">{document.title}</td>
                <td className="px-4 py-3 text-slate-600">{document.category}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatSize(document.fileSize)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {document.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/documents/${document.id}/file?mode=preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      Preview
                    </a>
                    <a
                      href={`/api/documents/${document.id}/file?mode=download`}
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      Download
                    </a>
                    {canManage && <DeleteButton documentId={document.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
