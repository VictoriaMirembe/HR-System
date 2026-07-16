import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { describeActionLabel, describeAuditEntry } from "@/lib/audit/describe";
import { resolveEntityLabels } from "@/lib/audit/resolve-entities";
import { PageHeader } from "@/components/page-header";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; entity?: string; page?: string }>;
}) {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.AUDIT_READ)) {
    redirect("/dashboard");
  }

  const { search, entity, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(search
      ? {
          OR: [
            { actorName: { contains: search, mode: "insensitive" } },
            { action: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [entries, totalCount, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    }),
  ]);

  const entityLabels = await resolveEntityLabels(prisma, entries);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (entity) params.set("entity", entity);
    params.set("page", String(targetPage));
    return `/audit-log?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        color="slate"
        title="Audit log"
        description="A permanent, append-only record of every create/update/delete action in the system — who did what, to which record, and when. Nothing here can be edited or removed through the app."
      />

      <form className="flex flex-wrap gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by actor or action..."
          className="min-w-[220px] flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <select
          name="entity"
          defaultValue={entity ?? ""}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          <option value="">All entities</option>
          {entities.map((row) => (
            <option key={row.entity} value={row.entity}>
              {row.entity}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/60 text-left text-xs uppercase tracking-wide text-sky-700/70">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {entries.map((entry) => {
              const resolvedLabel = entityLabels.get(`${entry.entity}:${entry.entityId}`);
              return (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {entry.timestamp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{entry.actorName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {describeActionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {entry.entity}
                    </span>
                    <br />
                    {resolvedLabel ?? `(record ${entry.entityId}, not found — may have been deleted)`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {describeAuditEntry(
                      entry.action,
                      entry.metadata as Record<string, unknown> | null
                    )}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No matching audit log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({totalCount} entries)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-full border border-sky-200 px-3 py-1.5 font-medium text-sky-700 transition hover:bg-sky-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-full border border-sky-200 px-3 py-1.5 font-medium text-sky-700 transition hover:bg-sky-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
