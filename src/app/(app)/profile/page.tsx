import { UserCog } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ProfilePictureUpload } from "./profile-picture-upload";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await verifySession();

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
  });

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        icon={UserCog}
        color="sky"
        title="My profile"
        description="You can update your mobile number, personal email, and emergency contact here. HR is notified whenever you save a change and can always override it. Job title, department, and salary are HR-managed — contact HR to update those."
      />

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <h2 className="mb-3 text-sm font-semibold text-sky-700">
          Profile picture
        </h2>
        <ProfilePictureUpload
          employeeId={employee.id}
          hasPicture={!!employee.profilePictureKey}
        />
      </div>

      <ProfileForm
        initialValues={{
          mobile: employee.mobile ?? "",
          personalEmail: employee.personalEmail,
          emergencyContactName: employee.emergencyContactName ?? "",
          emergencyContactPhone: employee.emergencyContactPhone ?? "",
        }}
      />
    </div>
  );
}
