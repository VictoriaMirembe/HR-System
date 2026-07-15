"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecisionButtons({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "APPROVE" | "DECLINE") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leave-requests/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: decision === "DECLINE" ? reason : undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to record decision.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (declining) {
    return (
      <div className="space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for declining"
          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide("DECLINE")}
            disabled={submitting || reason.trim().length === 0}
            className="rounded-full bg-red-700 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Confirm decline"}
          </button>
          <button
            type="button"
            onClick={() => setDeclining(false)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => decide("APPROVE")}
          disabled={submitting}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setDeclining(true)}
          disabled={submitting}
          className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
