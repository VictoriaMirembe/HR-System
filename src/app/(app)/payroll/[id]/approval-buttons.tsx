"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalButtons({
  payrollRunId,
  status,
  canApproveHr,
  canApproveFinance,
}: {
  payrollRunId: number;
  status: string;
  canApproveHr: boolean;
  canApproveFinance: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function approve(endpoint: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payroll/runs/${payrollRunId}/${endpoint}`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to approve.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const showHrButton = canApproveHr && status === "DRAFT";
  const showFinanceButton = canApproveFinance && status === "HR_APPROVED";

  if (!showHrButton && !showFinanceButton) return null;

  return (
    <div className="mt-4 space-y-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        {showHrButton && (
          <button
            type="button"
            onClick={() => approve("approve-hr")}
            disabled={submitting}
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:opacity-60"
          >
            {submitting ? "Approving..." : "Approve (HR)"}
          </button>
        )}
        {showFinanceButton && (
          <button
            type="button"
            onClick={() => approve("approve-finance")}
            disabled={submitting}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? "Approving..." : "Approve for payment"}
          </button>
        )}
      </div>
    </div>
  );
}
