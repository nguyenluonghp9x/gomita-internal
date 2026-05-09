import { requirePermission } from "@/lib/auth/session";
import { NotificationList } from "@/app/(dashboard)/notifications/notification-actions-client";
import { listNotifications } from "@/server/services/notification-service";

export default async function NotificationsPage() {
  const user = await requirePermission("notifications.view");
  const raw = await listNotifications(user.id, 100);
  const items = raw.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    route: n.route,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    type: n.type,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">In-app messages for training, documents, and workflows.</p>
      </div>
      <NotificationList items={items} />
    </div>
  );
}
