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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Welcome, {user.employee.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set a password to activate your account
          </p>
        </div>
        {isValid ? (
          <SetupForm token={token} />
        ) : (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This setup link has expired. Contact HR for a new one.
          </p>
        )}
      </div>
    </div>
  );
}
