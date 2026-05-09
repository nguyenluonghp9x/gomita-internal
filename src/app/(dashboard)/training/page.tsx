import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAssignedPublishedCoursesForUser } from "@/server/services/assignment-service";
import {
  getUserTrainingSummary,
  listCoursesForManagement,
  listPublishedCourses,
} from "@/server/services/training-service";

export default async function TrainingPage() {
  const user = await requirePermission("training.view");
  const canManage = await hasPermission(user.id, "training.create");

  const [published, myProgress, manageList, assigned] = await Promise.all([
    listPublishedCourses(),
    getUserTrainingSummary(user.id),
    canManage ? listCoursesForManagement() : Promise.resolve([]),
    getAssignedPublishedCoursesForUser(user.id),
  ]);

  const progressByCourseId = new Map(myProgress.map((e) => [e.courseId, e]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Training</h1>
        {canManage ? (
          <Link
            href="/training/courses/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            New course
          </Link>
        ) : null}
      </div>

      {assigned.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Assigned to you</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {assigned.map((row) => {
              const overdue = row.dueAt ? new Date(row.dueAt) < new Date() : false;
              return (
                <Link
                  key={row.courseId}
                  href={`/training/courses/${row.courseId}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm transition hover:border-amber-300"
                >
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {row.dueAt ? (
                      <>
                        Due: {new Date(row.dueAt).toLocaleString()}
                        {overdue ? <span className="ml-2 font-medium text-rose-700">Overdue</span> : null}
                      </>
                    ) : (
                      "No due date"
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">My learning</h2>
        {myProgress.length === 0 ? (
          <p className="text-sm text-slate-600">You have no enrollments yet. Start a published course below.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myProgress.map((e) => (
              <Link
                key={e.id}
                href={`/training/courses/${e.courseId}`}
                className="rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <p className="font-medium text-slate-900">{e.course.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Progress: {e.progressPercent}%
                  {e.completedAt ? " - Completed" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Published catalog</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {published.map((c) => {
            const prog = progressByCourseId.get(c.id);
            return (
              <div key={c.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <Link href={`/training/courses/${c.id}`} className="font-medium text-slate-900 hover:underline">
                  {c.title}
                </Link>
                {c.topic ? <p className="mt-1 text-xs text-slate-500">{c.topic}</p> : null}
                <p className="mt-2 text-sm text-slate-600">
                  {prog ? `Your progress: ${prog.progressPercent}%` : "Not started"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {canManage ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">All courses (management)</h2>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3">Modules</th>
                  <th className="px-4 py-3">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                {manageList.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link href={`/training/courses/${c.id}`} className="font-medium text-slate-900 hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.isPublished ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{c._count.modules}</td>
                    <td className="px-4 py-3">{c._count.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
