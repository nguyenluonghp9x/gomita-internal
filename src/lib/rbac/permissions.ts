import { cache } from "react";

import { prisma } from "@/lib/prisma";

export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  return new Set(rows.flatMap((row) => row.role.permissions.map((p) => p.permission.key)));
}

export const getCachedUserPermissionKeys = cache(getUserPermissionKeys);

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const keys = await getCachedUserPermissionKeys(userId);
  return keys.has(permission);
}
