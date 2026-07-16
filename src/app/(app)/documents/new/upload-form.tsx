"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      // No Content-Type header set on purpose — the browser fills in the
      // correct multipart/form-data boundary automatically when the body
      // is a FormData instance. Setting it manually here would omit that
      // boundary and break the upload.
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const body = await res.json();

      if (!res.ok) {
        if (Array.isArray(body.issues) && body.issues.length > 0) {
          setError(
            body.issues
              .map((issue: { path?: (string | number)[]; message: string }) =>
                issue.path && issue.path.length > 0
                  ? `${issue.path.join(".")}: ${issue.message}`
                  : issue.message
              )
              .join(" ")
          );
        } else {
          setError(body.error ?? "Something went wrong.");
        }
        setSubmitting(false);
        return;
      }

      router.push("/documents");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm"
    >
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <input
          id="category"
          name="category"
          type="text"
          required
          placeholder="e.g. Policy, Handbook, Manual"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          File (PDF)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-100"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
