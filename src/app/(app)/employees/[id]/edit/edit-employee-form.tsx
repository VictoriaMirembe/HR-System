"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { departmentValues } from "@/lib/validation/employee";

type PotentialManager = { id: number; fullName: string; jobTitle: string };
type RoleOption = { id: number; name: string };
type DepartmentHead = { id: number; fullName: string; department: string };

type InitialValues = {
  fullName: string;
  personalEmail: string;
  workEmail: string;
  dateOfBirth: string;
  gender: string;
  jobTitle: string;
  department: string;
  isDepartmentHead: boolean;
  lineManagerId: number | null;
  startDate: string;
  salary: string;
  bankName: string;
  bankAccountNumber: string;
  tin: string;
  nssfNumber: string;
  contractType: string;
  contractStart: string;
  contractEnd: string;
  nextAppraisalDate: string;
  roleId: number | null;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  healthStatus: string;
};

const CONTRACT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

export function EditEmployeeForm({
  employeeId,
  potentialManagers,
  roles,
  departmentHeads,
  initialValues,
}: {
  employeeId: number;
  potentialManagers: PotentialManager[];
  roles: RoleOption[];
  departmentHeads: DepartmentHead[];
  initialValues: InitialValues;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departmentHeadByDept = useMemo(() => {
    const map = new Map<string, DepartmentHead>();
    for (const head of departmentHeads) map.set(head.department, head);
    return map;
  }, [departmentHeads]);

  const [department, setDepartment] = useState(initialValues.department);
  const [isDepartmentHead, setIsDepartmentHead] = useState(initialValues.isDepartmentHead);
  const [lineManagerId, setLineManagerId] = useState(
    initialValues.lineManagerId !== null ? String(initialValues.lineManagerId) : ""
  );

  // Only reacts to changes made during this editing session — loading the
  // form doesn't overwrite whatever line manager is already saved. Picking
  // a different department (or toggling "head") re-applies the default;
  // HR can still override it manually afterward.
  function handleDepartmentChange(value: string) {
    setDepartment(value);
    if (!isDepartmentHead) {
      const head = departmentHeadByDept.get(value);
      setLineManagerId(head ? String(head.id) : "");
    }
  }

  function handleIsDepartmentHeadChange(checked: boolean) {
    setIsDepartmentHead(checked);
    if (checked) {
      setLineManagerId("");
    } else {
      const head = departmentHeadByDept.get(department);
      setLineManagerId(head ? String(head.id) : "");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const contractEnd = form.get("contractEnd");
    const nextAppraisalDate = form.get("nextAppraisalDate");
    const roleId = form.get("roleId");

    const payload = {
      fullName: form.get("fullName"),
      personalEmail: form.get("personalEmail"),
      workEmail: form.get("workEmail"),
      dateOfBirth: form.get("dateOfBirth"),
      gender: form.get("gender"),
      jobTitle: form.get("jobTitle"),
      department: form.get("department"),
      isDepartmentHead,
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
      nextAppraisalDate: nextAppraisalDate || null,
      roleId: roleId ? Number(roleId) : undefined,
      nextOfKinName: form.get("nextOfKinName") || null,
      nextOfKinRelationship: form.get("nextOfKinRelationship") || null,
      nextOfKinPhone: form.get("nextOfKinPhone") || null,
      healthStatus: form.get("healthStatus") || null,
    };

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
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

      router.push(`/employees/${employeeId}`);
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
        <Field
          label="Full name"
          name="fullName"
          type="text"
          required
          defaultValue={initialValues.fullName}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Personal email"
            name="personalEmail"
            type="email"
            required
            defaultValue={initialValues.personalEmail}
          />
          <Field
            label="Work email"
            name="workEmail"
            type="email"
            required
            defaultValue={initialValues.workEmail}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            required
            defaultValue={initialValues.dateOfBirth}
          />
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-700">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              required
              defaultValue={initialValues.gender}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="">Select...</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Used only to determine Maternity/Paternity Leave eligibility.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Job details
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Job title"
            name="jobTitle"
            type="text"
            required
            defaultValue={initialValues.jobTitle}
          />
          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-slate-700"
            >
              Department
            </label>
            <select
              id="department"
              name="department"
              required
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {/* Legacy records created before the department list was
                  fixed may hold a value outside departmentValues — surface
                  it as-is so saving the form doesn't silently switch their
                  department to whatever sorts first. */}
              {!(departmentValues as readonly string[]).includes(
                initialValues.department
              ) && (
                <option value={initialValues.department}>
                  {initialValues.department} (legacy — please update)
                </option>
              )}
              {departmentValues.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isDepartmentHead"
            type="checkbox"
            checked={isDepartmentHead}
            onChange={(e) => handleIsDepartmentHeadChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
          />
          <label htmlFor="isDepartmentHead" className="text-sm font-medium text-slate-700">
            This person is the head of their department
          </label>
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
            value={lineManagerId}
            onChange={(e) => setLineManagerId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            <option value="">None</option>
            {potentialManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName} — {manager.jobTitle}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            {isDepartmentHead
              ? "Department heads set their own manager manually (e.g. Senior Management)."
              : "Defaults to the selected department's head, if one is assigned — pick someone else to override."}
          </p>
        </div>
        <Field
          label="Start date"
          name="startDate"
          type="date"
          required
          defaultValue={initialValues.startDate}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">Contract</legend>
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
              defaultValue={initialValues.contractType}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Contract start"
            name="contractStart"
            type="date"
            required
            defaultValue={initialValues.contractStart}
          />
        </div>
        <Field
          label="Contract end (optional)"
          name="contractEnd"
          type="date"
          required={false}
          defaultValue={initialValues.contractEnd}
        />
        <Field
          label="Next appraisal date (optional)"
          name="nextAppraisalDate"
          type="date"
          required={false}
          defaultValue={initialValues.nextAppraisalDate}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Payroll details{" "}
          <span className="font-normal text-slate-400">
            (sensitive — see README for production encryption notes)
          </span>
        </legend>
        <Field
          label="Salary (monthly)"
          name="salary"
          type="number"
          required
          defaultValue={initialValues.salary}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Bank name"
            name="bankName"
            type="text"
            required
            defaultValue={initialValues.bankName}
          />
          <Field
            label="Bank account number"
            name="bankAccountNumber"
            type="text"
            required
            defaultValue={initialValues.bankAccountNumber}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="TIN"
            name="tin"
            type="text"
            required
            defaultValue={initialValues.tin}
          />
          <Field
            label="NSSF number"
            name="nssfNumber"
            type="text"
            required
            defaultValue={initialValues.nssfNumber}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Next of kin{" "}
          <span className="font-normal text-slate-400">
            (sensitive — HR only, optional)
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Full name"
            name="nextOfKinName"
            type="text"
            required={false}
            defaultValue={initialValues.nextOfKinName}
          />
          <Field
            label="Relationship"
            name="nextOfKinRelationship"
            type="text"
            required={false}
            defaultValue={initialValues.nextOfKinRelationship}
          />
        </div>
        <Field
          label="Phone number"
          name="nextOfKinPhone"
          type="text"
          required={false}
          defaultValue={initialValues.nextOfKinPhone}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-sky-700">
          Health{" "}
          <span className="font-normal text-slate-400">
            (sensitive — HR only, optional)
          </span>
        </legend>
        <div>
          <label
            htmlFor="healthStatus"
            className="block text-sm font-medium text-slate-700"
          >
            Health status
          </label>
          <textarea
            id="healthStatus"
            name="healthStatus"
            rows={3}
            defaultValue={initialValues.healthStatus}
            placeholder="e.g. Asthma, uses inhaler — or leave blank if none"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      </fieldset>

      {initialValues.roleId !== null && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-sky-700">
            System access
          </legend>
          <div>
            <label
              htmlFor="roleId"
              className="block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="roleId"
              name="roleId"
              defaultValue={initialValues.roleId}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Controls what this person can see and do in the system.
              Changing this takes effect the next time they sign in.
            </p>
          </div>
        </fieldset>
      )}

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

function Field({
  label,
  name,
  type,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
    </div>
  );
}
