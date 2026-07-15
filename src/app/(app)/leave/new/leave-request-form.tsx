"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type LeaveTypeOption = { id: number; name: string; remaining: number | null };
type PotentialDelegate = { id: number; fullName: string; jobTitle: string };

export function LeaveRequestForm({
  leaveTypes,
  potentialDelegates,
}: {
  leaveTypes: LeaveTypeOption[];
  potentialDelegates: PotentialDelegate[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const delegateId = form.get("delegateId");
    const payload = {
      leaveTypeId: Number(form.get("leaveTypeId")),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      reason: form.get("reason"),
      delegateId: delegateId ? Number(delegateId) : null,
    };

    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

      router.push("/leave");
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
        <label htmlFor="leaveTypeId" className="block text-sm font-medium text-slate-700">
          Leave type
        </label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        >
          {leaveTypes.map((leaveType) => (
            <option key={leaveType.id} value={leaveType.id}>
              {leaveType.name}
              {leaveType.remaining !== null ? ` (${leaveType.remaining} remaining)` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label htmlFor="delegateId" className="block text-sm font-medium text-slate-700">
          Covering for you (optional)
        </label>
        <select
          id="delegateId"
          name="delegateId"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        >
          <option value="">No one / not applicable</option>
          {potentialDelegates.map((delegate) => (
            <option key={delegate.id} value={delegate.id}>
              {delegate.fullName} — {delegate.jobTitle}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          If you have someone in charge while you&apos;re away, they&apos;ll be
          notified once your request is approved.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
