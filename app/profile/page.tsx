import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { getTeacherSmsSettings } from "@/lib/sms-server";
import { isSmsConfigured } from "@/lib/sms";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfilePanels } from "./ProfilePanels";

export default async function ProfilePage() {
  const user = asProfile(await requireUser());
  const isTeacher = user.role === "teacher";
  const smsSettings = isTeacher ? await getTeacherSmsSettings(user.id) : null;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Manage your photo, password, and display preferences."
      />
      <ProfilePanels
        profile={user}
        smsSettings={smsSettings}
        smsConfigured={isSmsConfigured()}
      />
    </>
  );
}
