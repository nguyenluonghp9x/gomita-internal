"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { createUser } from "@/server/services/admin-service";

export async function createUserAction(_: { ok: boolean; message: string }, formData: FormData) {
  const actor = await requirePermission("users.create");

  const result = await createUser({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    title: String(formData.get("title") ?? ""),
    departmentId: String(formData.get("departmentId") ?? ""),
    roleId: String(formData.get("roleId") ?? ""),
  });

  if (result.ok) {
    await writeAuditLog({
      actorId: actor.id,
      action: "OTHER",
      module: "users",
      resource: "user",
      resourceId: result.userId,
      metadata: { event: "user_created" },
    });
    revalidatePath("/admin/users");
  }

  return result;
}
