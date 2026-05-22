"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { markAllRead } from "@/app/notifications/actions";
import type { NotificationItem } from "@/lib/notifications-server";

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  // Mark everything read once the page is open.
  useEffect(() => {
    void markAllRead();
  }, []);

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Replies, @-mentions, and discussion activity will show up here."
        />
      </Card>
    );
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <ul className="divide-y divide-wood-100">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={n.href}
              className={[
                "block px-4 py-3 hover:bg-cream-200 transition-colors",
                n.read ? "" : "bg-honey-50/60",
              ].join(" ")}
            >
              <p className="text-sm text-wood-900">{n.message}</p>
              {n.createdAt && (
                <p className="text-xs text-wood-500 mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
