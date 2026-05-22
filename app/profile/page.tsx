import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfilePanels } from "./ProfilePanels";

export default async function ProfilePage() {
  const user = asProfile(await requireUser());

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Manage your photo, password, and display preferences."
      />
      <ProfilePanels profile={user} />
    </>
  );
}
