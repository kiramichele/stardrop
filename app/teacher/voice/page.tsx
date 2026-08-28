import { Radio, AlertCircle } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getCollaborativeAssignmentsWithGroups } from "@/lib/groups-server";
import { isVoiceChatConfigured } from "@/lib/voice-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { VoiceOverviewPanel } from "@/components/assignments/VoiceOverviewPanel";

export default async function TeacherVoicePage() {
  await requireTeacher();

  const header = (
    <PageHeader
      eyebrow="Groups"
      title="Voice chat"
      description="Every collaborative assignment's groups, who's talking right now, and a way to drop in on any of them."
    />
  );

  if (!isVoiceChatConfigured()) {
    return (
      <>
        {header}
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-wood-700">
            <AlertCircle className="w-4 h-4 text-terracotta-700 flex-shrink-0" />
            Voice chat isn&apos;t set up yet — it needs a{" "}
            <code className="text-xs bg-cream-100 px-1 py-0.5 rounded">
              DAILY_API_KEY
            </code>{" "}
            configured in the deployment environment.
          </p>
        </Card>
      </>
    );
  }

  const assignments = await getCollaborativeAssignmentsWithGroups();

  return (
    <>
      {header}
      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Radio}
            title="No collaborative groups yet"
            description="Once a collaborative assignment has groups, they'll show up here with a way to join their voice chat."
          />
        </Card>
      ) : (
        <VoiceOverviewPanel assignments={assignments} />
      )}
    </>
  );
}
