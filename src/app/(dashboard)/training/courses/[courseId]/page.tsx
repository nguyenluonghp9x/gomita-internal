import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { toggleCoursePublishAction, startCourseAction } from "@/app/(dashboard)/training/actions";
import { AddLessonForm } from "@/app/(dashboard)/training/courses/[courseId]/add-lesson-form";
import { AddModuleForm } from "@/app/(dashboard)/training/courses/[courseId]/add-module-form";
import { CreateQuizForm } from "@/app/(dashboard)/training/courses/[courseId]/create-quiz-form";
import { AssignCourseSection } from "@/app/(dashboard)/training/courses/[courseId]/assign-course-form";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getAssignmentFormOptions,
  listAssignmentsForCourse,
} from "@/server/services/assignment-service";
import { countLessonsInCourse, getCourseById, getEnrollment } from "@/server/services/training-service";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requirePermission("training.view");
  const canCreate = await hasPermission(user.id, "training.create");
  const canUpdate = await hasPermission(user.id, "training.update");

  const course = await getCourseById(courseId);
  if (!course) notFound();
  if (!course.isPublished && !canCreate) redirect("/unauthorized");

  const [enrollment, totalLessons, assignmentRows, assignOptions] = await Promise.all([
    getEnrollment(user.id, courseId),
    countLessonsInCourse(courseId),
    canCreate ? listAssignmentsForCourse(courseId) : Promise.resolve([]),
    canCreate ? getAssignmentFormOptions() : Promise.resolve(null),
  ]);

  const moduleOptions = course.modules.map((m) => ({ id: m.id, title: m.title }));

  const assignmentsForClient = assignmentRows.map((a) => ({
    id: a.id,
    targetType: a.targetType,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    targetPosition: a.targetPosition,
    targetUser: a.targetUser,
    targetRole: a.targetRole,
    targetDepartment: a.targetDepartment,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Course</p>
          <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
          {course.topic ? <p className="mt-1 text-sm text-slate-600">{course.topic}</p> : null}
          {course.description ? <p className="mt-2 max-w-2xl text-sm text-slate-600">{course.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {course.isPublished ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">Published</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Draft</span>
          )}
          {canUpdate ? (
            <div className="flex gap-2">
              {!course.isPublished ? (
                <form action={toggleCoursePublishAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="next" value="true" />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white"
                  >
                    Publish
                  </button>
                </form>
              ) : (
                <form action={toggleCoursePublishAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="next" value="false" />
                  <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium">
                    Unpublish
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {course.isPublished ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Your enrollment</p>
              <p className="text-sm text-slate-600">
                {enrollment
                  ? `Progress: ${enrollment.progressPercent}% · Lessons: ${totalLessons}`
                  : "Not enrolled yet - start to track progress."}
              </p>
            </div>
            <form action={startCourseAction}>
              <input type="hidden" name="courseId" value={course.id} />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                {enrollment ? "Refresh enrollment" : "Start course"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Curriculum</h2>
          {course.modules.length === 0 ? (
            <p className="text-sm text-slate-600">No modules yet.</p>
          ) : (
            <div className="space-y-4">
              {course.modules.map((mod) => (
                <div key={mod.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                  <ul className="mt-2 space-y-2">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          href={`/training/lessons/${lesson.id}`}
                          className="text-sm text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                        <span className="ml-2 text-xs text-slate-500">({lesson.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <h2 className="pt-4 text-lg font-semibold text-slate-900">Quizzes</h2>
          {course.quizzes.length === 0 ? (
            <p className="text-sm text-slate-600">No quizzes for this course yet.</p>
          ) : (
            <ul className="space-y-2">
              {course.quizzes.map((qz) => (
                <li key={qz.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-slate-800">{qz.title}</span>
                  <span className="text-slate-500">
                    Pass {qz.passScore}% · Max {qz.maxAttempts} tries
                  </span>
                  <Link href={`/training/quizzes/${qz.id}/take`} className="text-slate-900 underline">
                    Take
                  </Link>
                  {canCreate ? (
                    <Link href={`/training/quizzes/${qz.id}/edit`} className="text-slate-600 underline">
                      Edit
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canCreate ? (
          <div className="space-y-4">
            <CreateQuizForm courseId={course.id} />
            {assignOptions ? (
              <AssignCourseSection
                courseId={course.id}
                assignments={assignmentsForClient}
                users={assignOptions.users}
                roles={assignOptions.roles}
                departments={assignOptions.departments}
              />
            ) : null}
            <AddModuleForm courseId={course.id} />
            <AddLessonForm courseId={course.id} modules={moduleOptions} />
          </div>
        ) : null}
      </div>

      <Link href="/training" className="text-sm text-slate-600 hover:underline">
        Back to training
      </Link>
    </div>
  );
}
