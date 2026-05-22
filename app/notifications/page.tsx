import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await getNotifications(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Replies to your posts, @-mentions, and discussion activity."
      />
      <NotificationsList items={items} />
    </>
  );
}
