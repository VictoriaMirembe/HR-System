"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GeneratePayrollForm({ period }: { period: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll/runs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to generate payroll.");
        setSubmitting(false);
        return;
      }
      setMessage(
        `Generated ${body.generatedCount} run(s)` +
          (body.skippedCount > 0
            ? `, skipped ${body.skippedCount} already-approved run(s).`
            : ".")
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-sky-50 bg-sky-50/50 p-4">
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      {message && <p className="mb-2 text-sm text-emerald-700">{message}</p>}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={submitting}
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:opacity-60"
      >
        {submitting ? "Generating..." : `Generate/recalculate ${period} payroll`}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Calculates gross pay from base salary + overtime (from attendance),
        and deducts approved Unpaid Leave for the period. Runs already HR-
        or Finance-approved are left untouched.
      </p>
    </div>
  );
}
