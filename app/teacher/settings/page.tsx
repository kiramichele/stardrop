import { requireTeacher } from "@/lib/auth";
import { getUnitySimulationEnabled } from "@/lib/app-settings-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { UnitySimulationToggle } from "@/components/teacher/UnitySimulationToggle";

export default async function TeacherSettingsPage() {
  await requireTeacher();
  const unityEnabled = await getUnitySimulationEnabled();

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Settings"
        description="Class-wide feature toggles. Changes take effect immediately for every student."
      />
      <div className="max-w-2xl space-y-4">
        <UnitySimulationToggle initialEnabled={unityEnabled} />
      </div>
    </>
  );
}
