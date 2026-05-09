"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import {
  addQuizEssayQuestion,
  addQuizMcQuestion,
  createQuiz,
  saveQuizAttempt,
} from "@/server/services/training-service";

export async function createQuizAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!courseId) return { ok: false, message: "Missing course" };
  if (title.length < 2) return { ok: false, message: "Title is required" };

  const passScore = Math.min(100, Math.max(0, Number.parseInt(String(formData.get("passScore") ?? "70"), 10) || 70));
  const maxAttempts = Math.min(20, Math.max(1, Number.parseInt(String(formData.get("maxAttempts") ?? "3"), 10) || 3));

  const quiz = await createQuiz(courseId, { title, passScore, maxAttempts });
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "quiz",
    resourceId: quiz.id,
    metadata: { event: "quiz_created", courseId, title: quiz.title },
  });
  revalidatePath(`/training/courses/${courseId}`);
  redirect(`/training/quizzes/${quiz.id}/edit`);
}

export async function addMcQuestionAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const quizId = String(formData.get("quizId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const o0 = String(formData.get("opt0") ?? "").trim();
  const o1 = String(formData.get("opt1") ?? "").trim();
  const o2 = String(formData.get("opt2") ?? "").trim();
  const o3 = String(formData.get("opt3") ?? "").trim();
  const correctRaw = String(formData.get("correctIndex") ?? "0");
  const correctIndex = Number.parseInt(correctRaw, 10);
  const point = Math.min(100, Math.max(1, Number.parseInt(String(formData.get("point") ?? "1"), 10) || 1));

  if (!quizId || !courseId) return { ok: false, message: "Missing quiz or course" };
  if (!question) return { ok: false, message: "Question text is required" };

  const options = [o0, o1, o2, o3].filter((o) => o.length > 0);
  try {
    await addQuizMcQuestion(quizId, {
      question,
      options,
      correctIndex: Number.isFinite(correctIndex) ? correctIndex : 0,
      point,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid question";
    return { ok: false, message: msg === "AT_LEAST_TWO_OPTIONS" ? "Add at least two options" : "Could not save question" };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "quiz_question",
    resourceId: quizId,
    metadata: { event: "mc_question_added", courseId },
  });
  revalidatePath(`/training/quizzes/${quizId}/edit`);
  revalidatePath(`/training/courses/${courseId}`);
  return { ok: true, message: "Question added" };
}

export async function addEssayQuestionAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("training.create");
  const quizId = String(formData.get("quizId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const point = Math.min(100, Math.max(1, Number.parseInt(String(formData.get("point") ?? "2"), 10) || 2));
  if (!quizId || !courseId) return { ok: false, message: "Missing quiz or course" };
  if (!question) return { ok: false, message: "Question text is required" };

  await addQuizEssayQuestion(quizId, { question, point });
  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "quiz_question",
    resourceId: quizId,
    metadata: { event: "essay_question_added", courseId },
  });
  revalidatePath(`/training/quizzes/${quizId}/edit`);
  revalidatePath(`/training/courses/${courseId}`);
  return { ok: true, message: "Question added" };
}

export type QuizSubmitResult =
  | { ok: true; scorePercent: number; passed: boolean; attemptNo: number; courseId: string }
  | { ok: false; message: string };

export async function submitQuizAttemptAction(formData: FormData): Promise<QuizSubmitResult> {
  const actor = await requirePermission("training.view");
  const quizId = String(formData.get("quizId") ?? "");
  if (!quizId) return { ok: false, message: "Missing quiz" };

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_") && typeof value === "string") {
      answers[key.slice(2)] = value;
    }
  }

  const result = await saveQuizAttempt(actor.id, quizId, answers);
  if (!result.ok) return result;

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "training",
    resource: "quiz_attempt",
    resourceId: quizId,
    metadata: {
      event: "quiz_submitted",
      scorePercent: result.scorePercent,
      passed: result.passed,
      attemptNo: result.attemptNo,
    },
  });
  revalidatePath(`/training/quizzes/${quizId}/take`);
  revalidatePath(`/training/courses/${result.courseId}`);
  revalidatePath("/training");
  return result;
}
