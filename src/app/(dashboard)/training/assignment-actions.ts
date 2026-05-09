"use server";

import { revalidatePath } from "next/cache";
import { AssignmentTargetType } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import {
  createCourseAssignment,
  deleteCourseAssignment,
} from "@/server/services/assignment-service";
import type { ActionMessage } from "@/app/(dashboard)/training/actions";

const TARGET_TYPES = new Set<AssignmentTargetType>(["USER", "ROLE", "DEPARTMENT", "POSITION"]);

export async function createCourseAssignmentAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const courseId = String(formData.get("courseId") ?? "");
  const targetTypeRaw = String(formData.get("targetType") ?? "");
  const dueRaw = String(formData.get("dueAt") ?? "").trim();

  if (!courseId) return { ok: false, message: "Missing course" };
  if (!TARGET_TYPES.has(targetTypeRaw as AssignmentTargetType)) {
    return { ok: false, message: "Invalid target type" };
  }
  const targetType = targetTypeRaw as AssignmentTargetType;

  let dueAt: Date | null = null;
  if (dueRaw) {
    const d = new Date(dueRaw);
    if (!Number.isFinite(d.getTime())) return { ok: false, message: "Invalid due date" };
    dueAt = d;
  }

  const targetUserId = targetType === "USER" ? String(formData.get("targetUserId") ?? "") || null : null;
  const targetRoleId = targetType === "ROLE" ? String(formData.get("targetRoleId") ?? "") || null : null;
  const targetDepartmentId =
    targetType === "DEPARTMENT" ? String(formData.get("targetDepartmentId") ?? "") || null : null;
  const targetPosition = targetType === "POSITION" ? String(formData.get("targetPosition") ?? "").trim() || null : null;

  if (targetType === "USER" && !targetUserId) return { ok: false, message: "Select a user" };
  if (targetType === "ROLE" && !targetRoleId) return { ok: false, message: "Select a role" };
  if (targetType === "DEPARTMENT" && !targetDepartmentId) return { ok: false, message: "Select a department" };
  if (targetType === "POSITION" && !targetPosition) return { ok: false, message: "Enter position code" };

  const { assignment, notifiedCount } = await createCourseAssignment({
    courseId,
    targetType,
    targetUserId,
    targetRoleId,
    targetDepartmentId,
    targetPosition,
    dueAt,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "course_assignment",
    resourceId: assignment.id,
    metadata: {
      event: "assignment_created",
      courseId,
      targetType,
      notifiedCount,
    },
  });

  revalidatePath(`/training/courses/${courseId}`);
  revalidatePath("/training");
  return {
    ok: true,
    message: `Assignment saved. Notified ${notifiedCount} user(s).`,
  };
}

export async function deleteCourseAssignmentAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("training.create");
  const courseId = String(formData.get("courseId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!courseId || !assignmentId) return;

  const ok = await deleteCourseAssignment(assignmentId, courseId);
  if (ok) {
    await writeAuditLog({
      actorId: actor.id,
      action: "OTHER",
      module: "training",
      resource: "course_assignment",
      resourceId: assignmentId,
      metadata: { event: "assignment_deleted", courseId },
    });
  }
  revalidatePath(`/training/courses/${courseId}`);
  revalidatePath("/training");
}
