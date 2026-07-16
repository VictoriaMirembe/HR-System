"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdjustmentForm({ payrollRunId }: { payrollRunId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      amount: form.get("amount"),
      reason: form.get("reason"),
    };

    try {
      const res = await fetch(`/api/payroll/runs/${payrollRunId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add adjustment.");
        setSubmitting(false);
        return;
      }
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2 rounded-xl border border-sky-50 bg-sky-50/40 p-4">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          name="amount"
          step="0.01"
          required
          placeholder="Amount (+/-)"
          className="col-span-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <input
          type="text"
          name="reason"
          required
          placeholder="Reason"
          className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
      >
        {submitting ? "Adding..." : "Add adjustment"}
      </button>
      <p className="text-xs text-slate-500">
        Positive amount = bonus, negative = deduction. A reason is required
        for either.
      </p>
    </form>
  );
}
