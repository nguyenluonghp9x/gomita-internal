"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LessonType } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import {
  addLesson,
  addModule,
  createCourse,
  markLessonCompleted,
  startOrGetEnrollment,
  updateCoursePublish,
} from "@/server/services/training-service";

const LESSON_TYPES = new Set<LessonType>(["VIDEO", "ARTICLE", "PDF", "SLIDE", "DOWNLOAD"]);

export type ActionMessage = { ok: boolean; message: string };

export async function createCourseAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { ok: false, message: "Title is required" };
  const topic = String(formData.get("topic") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const publish = String(formData.get("publish") ?? "") === "on";

  const course = await createCourse({
    title,
    topic: topic || null,
    description: description || null,
    isPublished: publish,
  });
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "course",
    resourceId: course.id,
    metadata: { event: "course_created", title: course.title },
  });
  revalidatePath("/training");
  redirect(`/training/courses/${course.id}`);
}

export async function toggleCoursePublishAction(formData: FormData) {
  const actor = await requirePermission("training.update");
  const courseId = String(formData.get("courseId") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!courseId) return;
  await updateCoursePublish(courseId, next);
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "course",
    resourceId: courseId,
    metadata: { event: "course_publish_toggled", isPublished: next },
  });
  revalidatePath("/training");
  revalidatePath(`/training/courses/${courseId}`);
}

export async function addModuleAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!courseId) return { ok: false, message: "Missing course" };
  if (!title) return { ok: false, message: "Module title is required" };
  await addModule(courseId, title);
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "course_module",
    resourceId: courseId,
    metadata: { event: "module_added", title },
  });
  revalidatePath(`/training/courses/${courseId}`);
  return { ok: true, message: "Module added" };
}

export async function addLessonAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const courseId = String(formData.get("courseId") ?? "");
  const courseModuleId = String(formData.get("courseModuleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "ARTICLE");
  const type = LESSON_TYPES.has(typeRaw as LessonType) ? (typeRaw as LessonType) : "ARTICLE";

  if (!courseId || !courseModuleId) return { ok: false, message: "Missing course or module" };
  if (!title) return { ok: false, message: "Lesson title is required" };

  const content = String(formData.get("content") ?? "").trim();
  const mediaUrl = String(formData.get("mediaUrl") ?? "").trim();
  const downloadable = String(formData.get("downloadable") ?? "") === "on";
  const estimatedRaw = String(formData.get("estimatedMin") ?? "").trim();
  const estimatedMin = estimatedRaw ? Number.parseInt(estimatedRaw, 10) : null;

  await addLesson(courseModuleId, {
    title,
    type,
    content: content || null,
    mediaUrl: mediaUrl || null,
    downloadable,
    estimatedMin: Number.isFinite(estimatedMin) ? estimatedMin : null,
  });
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "lesson",
    resourceId: courseModuleId,
    metadata: { event: "lesson_added", title, courseId },
  });
  revalidatePath(`/training/courses/${courseId}`);
  return { ok: true, message: "Lesson added" };
}

export async function startCourseAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("training.view");
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return;
  const result = await startOrGetEnrollment(actor.id, courseId);
  if (!result.ok) return;
  revalidatePath("/training");
  revalidatePath(`/training/courses/${courseId}`);
}

export async function completeLessonAction(lessonId: string) {
  const actor = await requirePermission("training.view");
  const result = await markLessonCompleted(actor.id, lessonId);
  if (!result.ok) return result;
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "lesson_progress",
    resourceId: lessonId,
    metadata: { event: "lesson_completed", courseId: result.courseId },
  });
  revalidatePath("/training");
  revalidatePath(`/training/lessons/${lessonId}`);
  revalidatePath(`/training/courses/${result.courseId}`);
  return { ok: true as const };
}
