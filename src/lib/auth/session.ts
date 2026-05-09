import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac/permissions";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function requirePermission(permissionKey: string) {
  const user = await requireAuth();
  const allowed = await hasPermission(user.id, permissionKey);
  if (!allowed) {
    redirect("/unauthorized");
  }
  return user;
}
