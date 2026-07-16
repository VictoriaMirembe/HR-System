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
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset in /public, not remote */}
          <img
            src="/mci-logo.png"
            alt="Media Challenge Initiative"
            className="mx-auto mb-4 h-16 w-auto"
          />
          <h1 className="text-xl font-semibold text-white">HR System</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in with your work email
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
