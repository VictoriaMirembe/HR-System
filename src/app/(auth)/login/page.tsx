import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/dal";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            MCI HR System
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your work email
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
