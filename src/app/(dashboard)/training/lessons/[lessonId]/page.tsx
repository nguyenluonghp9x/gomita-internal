import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CompleteLessonButton } from "@/app/(dashboard)/training/lessons/[lessonId]/complete-lesson-button";
import { requirePermission } from "@/lib/auth/session";
import { getEnrollment, getLessonContext } from "@/server/services/training-service";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await requirePermission("training.view");

  const lesson = await getLessonContext(lessonId);
  if (!lesson) notFound();

  const course = lesson.courseModule.course;
  const courseId = course.id;

  if (!course.isPublished) {
    redirect(`/training/courses/${courseId}`);
  }

  const enrollment = await getEnrollment(user.id, courseId);
  if (!enrollment) {
    redirect(`/training/courses/${courseId}`);
  }

  const progress = enrollment.lessons.find((l) => l.lessonId === lessonId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">{course.title}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{lesson.title}</h1>
        <p className="mt-1 text-sm text-slate-600">Type: {lesson.type}</p>
      </div>

      {lesson.mediaUrl ? (
        <p className="text-sm">
          <span className="font-medium text-slate-700">Media: </span>
          <a href={lesson.mediaUrl} className="text-slate-900 underline" target="_blank" rel="noreferrer">
            Open link
          </a>
        </p>
      ) : null}

      {lesson.content ? (
        <article className="prose prose-slate max-w-none rounded-xl border bg-white p-6 text-sm shadow-sm">
          <div className="whitespace-pre-wrap text-slate-800">{lesson.content}</div>
        </article>
      ) : (
        <p className="text-sm text-slate-600">No content for this lesson.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {progress?.isCompleted ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">Completed</span>
        ) : (
          <CompleteLessonButton lessonId={lesson.id} />
        )}
        <Link href={`/training/courses/${courseId}`} className="text-sm text-slate-600 hover:underline">
          Back to course
        </Link>
      </div>
    </div>
  );
}
