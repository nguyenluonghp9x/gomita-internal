"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notification-service";

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await requireAuth();
  if (!(await hasPermission(user.id, "notifications.view"))) return;
  await markNotificationRead(user.id, notificationId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireAuth();
  if (!(await hasPermission(user.id, "notifications.view"))) return;
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
}
