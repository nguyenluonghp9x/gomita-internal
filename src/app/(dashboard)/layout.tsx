import { getServerSession } from "next-auth";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { authOptions } from "@/lib/auth";
import { countUnreadNotifications } from "@/server/services/notification-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let unreadCount = 0;
  if (session?.user?.id) {
    unreadCount = await countUnreadNotifications(session.user.id);
  }

  return (
    <DashboardShell unreadCount={unreadCount} key={unreadCount}>
      {children}
    </DashboardShell>
  );
}
