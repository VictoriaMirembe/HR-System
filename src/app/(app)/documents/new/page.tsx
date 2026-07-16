import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BackLink } from "@/components/back-link";
import { UploadForm } from "./upload-form";

export default async function NewDocumentPage() {
  const session = await verifySession();
  if (!hasPermission(session, PERMISSIONS.DOCUMENT_UPLOAD)) {
    redirect("/documents");
  }

  return (
    <div className="max-w-lg space-y-6">
      <BackLink href="/documents" label="Back to documents" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Upload document
        </h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
        <p className="mt-3 text-sm text-slate-500">
          PDF only, up to 20MB. Employees can preview and download but not
          upload — keeps the repository to what HR has actually published.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
