"use client";

import { useActionState } from "react";
import { completeSetup } from "@/app/actions/auth";

export function SetupForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(completeSetup, undefined);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm"
    >
      <input type="hidden" name="token" value={token} />

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-300"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <p className="mt-1 text-xs text-slate-500">
          At least 8 characters, with uppercase, lowercase, a number, and a
          symbol. Avoid common or predictable passwords.
        </p>
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-300"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sky-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Setting up..." : "Activate account"}
      </button>
    </form>
  );
}
