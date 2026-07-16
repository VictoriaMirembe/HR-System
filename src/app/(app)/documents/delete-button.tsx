"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({ documentId }: { documentId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to delete.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-700 hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={submitting}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {submitting ? "Deleting..." : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-slate-500 hover:underline"
      >
        Cancel
      </button>
    </span>
  );
}
