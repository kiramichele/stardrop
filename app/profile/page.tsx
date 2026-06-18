import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { getTeacherSmsSettings } from "@/lib/sms-server";
import { isSmsConfigured } from "@/lib/sms";
import { getStudentIdentityByUsername } from "@/lib/starhub-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfilePanels } from "./ProfilePanels";

export default async function ProfilePage() {
  const user = asProfile(await requireUser());
  const isTeacher = user.role === "teacher";
  const [smsSettings, identity] = await Promise.all([
    isTeacher ? getTeacherSmsSettings(user.id) : Promise.resolve(null),
    getStudentIdentityByUsername(user.username),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Manage your photo, password, display preferences, and your StarHub identity."
      />
      <ProfilePanels
        profile={user}
        smsSettings={smsSettings}
        smsConfigured={isSmsConfigured()}
        initialBio={identity?.bio ?? ""}
        initialStudio={identity?.studio ?? ""}
      />
    </>
  );
}
