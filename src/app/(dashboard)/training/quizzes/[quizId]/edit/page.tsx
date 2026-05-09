import Link from "next/link";
import { notFound } from "next/navigation";

import { AddEssayQuestionForm } from "@/app/(dashboard)/training/quizzes/[quizId]/edit/add-essay-question-form";
import { AddMcQuestionForm } from "@/app/(dashboard)/training/quizzes/[quizId]/edit/add-mc-question-form";
import { requirePermission } from "@/lib/auth/session";
import { getQuizForEdit } from "@/server/services/training-service";

export default async function QuizEditPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  await requirePermission("training.create");

  const quiz = await getQuizForEdit(quizId);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Edit quiz</p>
        <h1 className="text-2xl font-semibold text-slate-900">{quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Course:{" "}
          <Link href={`/training/courses/${quiz.courseId}`} className="underline">
            {quiz.course.title}
          </Link>{" "}
          · Pass {quiz.passScore}% · Max attempts {quiz.maxAttempts}
        </p>
      </div>

      <section className="rounded-xl border bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Questions ({quiz.questions.length})</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-slate-800">
          {quiz.questions.map((q) => (
            <li key={q.id}>
              <span className="font-medium">{q.type}</span>: {q.question}{" "}
              <span className="text-slate-500">({q.point} pt)</span>
            </li>
          ))}
        </ol>
        {quiz.questions.length === 0 ? <p className="mt-2 text-sm text-slate-600">No questions yet.</p> : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AddMcQuestionForm quizId={quiz.id} courseId={quiz.courseId} />
        <AddEssayQuestionForm quizId={quiz.id} courseId={quiz.courseId} />
      </div>

      <Link href={`/training/quizzes/${quiz.id}/take`} className="text-sm text-slate-600 hover:underline">
        Preview / take quiz
      </Link>
    </div>
  );
}
