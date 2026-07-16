"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type InitialValues = {
  mobile: string;
  personalEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export function ProfileForm({ initialValues }: { initialValues: InitialValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      mobile: form.get("mobile"),
      personalEmail: form.get("personalEmail"),
      emergencyContactName: form.get("emergencyContactName"),
      emergencyContactPhone: form.get("emergencyContactPhone"),
    };

    try {
      const res = await fetch("/api/employees/me", {
        method: "PATCH",
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

      setSuccess("Saved. HR has been notified of this change.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
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
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div>
        <label htmlFor="mobile" className="block text-sm font-medium text-slate-700">
          Mobile number
        </label>
        <input
          id="mobile"
          name="mobile"
          type="tel"
          required
          defaultValue={initialValues.mobile}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label htmlFor="personalEmail" className="block text-sm font-medium text-slate-700">
          Personal email
        </label>
        <input
          id="personalEmail"
          name="personalEmail"
          type="email"
          required
          defaultValue={initialValues.personalEmail}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label
          htmlFor="emergencyContactName"
          className="block text-sm font-medium text-slate-700"
        >
          Emergency contact name
        </label>
        <input
          id="emergencyContactName"
          name="emergencyContactName"
          type="text"
          required
          defaultValue={initialValues.emergencyContactName}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div>
        <label
          htmlFor="emergencyContactPhone"
          className="block text-sm font-medium text-slate-700"
        >
          Emergency contact phone
        </label>
        <input
          id="emergencyContactPhone"
          name="emergencyContactPhone"
          type="tel"
          required
          defaultValue={initialValues.emergencyContactPhone}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
