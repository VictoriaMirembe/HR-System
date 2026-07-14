"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type PotentialManager = { id: number; fullName: string; jobTitle: string };

const CONTRACT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

export function EmployeeForm({
  potentialManagers,
}: {
  potentialManagers: PotentialManager[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const lineManagerId = form.get("lineManagerId");
    const contractEnd = form.get("contractEnd");

    const payload = {
      fullName: form.get("fullName"),
      personalEmail: form.get("personalEmail"),
      workEmail: form.get("workEmail"),
      dateOfBirth: form.get("dateOfBirth"),
      jobTitle: form.get("jobTitle"),
      department: form.get("department"),
      lineManagerId: lineManagerId ? Number(lineManagerId) : null,
      startDate: form.get("startDate"),
      salary: form.get("salary"),
      bankName: form.get("bankName"),
      bankAccountNumber: form.get("bankAccountNumber"),
      tin: form.get("tin"),
      nssfNumber: form.get("nssfNumber"),
      contractType: form.get("contractType"),
      contractStart: form.get("contractStart"),
      contractEnd: contractEnd || null,
    };

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        // The API returns both a generic `error` and, for validation
        // failures, a Zod `issues` array with the specific field(s) and
        // reason(s) — surface those instead of just "Validation failed".
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

      router.push(`/employees/${body.employee.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm"
    >
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Personal details
        </legend>
        <Field label="Full name" name="fullName" type="text" required />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Personal email"
            name="personalEmail"
            type="email"
            required
          />
          <Field label="Work email" name="workEmail" type="email" required />
        </div>
        <Field label="Date of birth" name="dateOfBirth" type="date" required />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Job details
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job title" name="jobTitle" type="text" required />
          <Field label="Department" name="department" type="text" required />
        </div>
        <div>
          <label
            htmlFor="lineManagerId"
            className="block text-sm font-medium text-slate-700"
          >
            Line manager
          </label>
          <select
            id="lineManagerId"
            name="lineManagerId"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            <option value="">None</option>
            {potentialManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName} — {manager.jobTitle}
              </option>
            ))}
          </select>
        </div>
        <Field label="Start date" name="startDate" type="date" required />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Contract
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contractType"
              className="block text-sm font-medium text-slate-700"
            >
              Contract type
            </label>
            <select
              id="contractType"
              name="contractType"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Field label="Contract start" name="contractStart" type="date" required />
        </div>
        <Field
          label="Contract end (optional)"
          name="contractEnd"
          type="date"
          required={false}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Payroll details{" "}
          <span className="font-normal text-slate-400">
            (sensitive — see README for production encryption notes)
          </span>
        </legend>
        <Field label="Salary (monthly)" name="salary" type="number" required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank name" name="bankName" type="text" required />
          <Field
            label="Bank account number"
            name="bankAccountNumber"
            type="text"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="TIN" name="tin" type="text" required />
          <Field label="NSSF number" name="nssfNumber" type="text" required />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create employee"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
    </div>
  );
}
