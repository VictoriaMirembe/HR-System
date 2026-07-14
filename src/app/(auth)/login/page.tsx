import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/dal";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-400/40">
            <span className="text-lg font-bold text-sky-300">MCI</span>
          </div>
          <h1 className="text-xl font-semibold text-white">HR System</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in with your work email
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-slate-500">
          Media Challenge Initiative
        </p>
      </div>
    </div>
  );
}
