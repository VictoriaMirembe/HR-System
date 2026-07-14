import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

// Params are async in Next.js 15+ (Route Context Helper) — must be awaited.
export default async function SetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { setupToken: token },
    select: { setupTokenExpiresAt: true, employee: { select: { fullName: true } } },
  });

  const isValid = !!user && !!user.setupTokenExpiresAt && user.setupTokenExpiresAt > new Date();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-400/40">
            <span className="text-lg font-bold text-sky-300">MCI</span>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Welcome, {user.employee.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Set a password to activate your account
          </p>
        </div>
        {isValid ? (
          <SetupForm token={token} />
        ) : (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
            This setup link has expired. Contact HR for a new one.
          </p>
        )}
      </div>
    </div>
  );
}
