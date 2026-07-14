"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveButton({ employeeId }: { employeeId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/archive`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to archive employee.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (!confirming) {
    return (
      <div className="mt-3">
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Offboard employee
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <p className="text-sm text-red-700">Are you sure?</p>
      <button
        type="button"
        onClick={handleArchive}
        disabled={submitting}
        className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
      >
        {submitting ? "Archiving..." : "Yes, archive"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Cancel
      </button>
    </div>
  );
}
