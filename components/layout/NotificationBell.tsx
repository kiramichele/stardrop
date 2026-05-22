import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/notifications-server";

export async function NotificationBell({ userId }: { userId: string }) {
  const count = await getUnreadCount(userId);

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-cozy text-wood-600 hover:text-terracotta-700 hover:bg-cream-200 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5" strokeWidth={1.75} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-terracotta-500 text-white text-[0.65rem] font-semibold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
