import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { QuizTakeForm } from "@/app/(dashboard)/training/quizzes/[quizId]/take/quiz-take-form";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  countQuizAttempts,
  getEnrollment,
  getQuizForTaking,
  listQuizAttemptsForUser,
} from "@/server/services/training-service";

export default async function QuizTakePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const user = await requirePermission("training.view");
  const canCreate = await hasPermission(user.id, "training.create");

  const quiz = await getQuizForTaking(quizId);
  if (!quiz) notFound();
  if (!quiz.course.isPublished && !canCreate) redirect("/unauthorized");

  const enrollment = quiz.course.isPublished ? await getEnrollment(user.id, quiz.courseId) : null;
  if (quiz.course.isPublished && !enrollment) {
    redirect(`/training/courses/${quiz.courseId}`);
  }

  const [attemptCount, history] = await Promise.all([
    countQuizAttempts(quizId, user.id),
    listQuizAttemptsForUser(quizId, user.id),
  ]);
  const canSubmit = attemptCount < quiz.maxAttempts;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Quiz</p>
        <h1 className="text-2xl font-semibold text-slate-900">{quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pass score: {quiz.passScore}% · Attempts used: {attemptCount}/{quiz.maxAttempts}
        </p>
        <Link href={`/training/courses/${quiz.courseId}`} className="mt-2 inline-block text-sm text-slate-600 hover:underline">
          Back to course
        </Link>
        {canCreate ? (
          <Link
            href={`/training/quizzes/${quizId}/edit`}
            className="ml-4 inline-block text-sm text-slate-600 hover:underline"
          >
            Edit questions
          </Link>
        ) : null}
      </div>

      {history.length > 0 ? (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Your recent attempts</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {history.map((h) => (
              <li key={h.id}>
                #{h.attemptNo}: {h.score}% {h.passed ? "(passed)" : "(not passed)"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <QuizTakeForm quizId={quiz.id} questions={quiz.questions} canSubmit={canSubmit} />
    </div>
  );
}
