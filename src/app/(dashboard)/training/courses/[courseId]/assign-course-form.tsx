"use client";

import { useMemo, useState, useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import {
  createCourseAssignmentAction,
  deleteCourseAssignmentAction,
} from "@/app/(dashboard)/training/assignment-actions";

const initial: ActionMessage = { ok: true, message: "" };

type OptUser = { id: string; fullName: string; email: string };
type OptRole = { id: string; name: string; code: string };
type OptDept = { id: string; name: string; code: string };

type AssignmentRow = {
  id: string;
  targetType: string;
  dueAt: string | null;
  targetUser: OptUser | null;
  targetRole: OptRole | null;
  targetDepartment: OptDept | null;
  targetPosition: string | null;
};

function labelAssignment(a: AssignmentRow): string {
  if (a.targetType === "USER" && a.targetUser) return `User: ${a.targetUser.fullName}`;
  if (a.targetType === "ROLE" && a.targetRole) return `Role: ${a.targetRole.name}`;
  if (a.targetType === "DEPARTMENT" && a.targetDepartment) return `Dept: ${a.targetDepartment.name}`;
  if (a.targetType === "POSITION" && a.targetPosition) return `Position: ${a.targetPosition}`;
  return a.targetType;
}

export function AssignCourseSection({
  courseId,
  assignments,
  users,
  roles,
  departments,
}: {
  courseId: string;
  assignments: AssignmentRow[];
  users: OptUser[];
  roles: OptRole[];
  departments: OptDept[];
}) {
  const [targetType, setTargetType] = useState("USER");
  const [state, formAction, pending] = useActionState(createCourseAssignmentAction, initial);

  const typeOptions = useMemo(
    () => [
      { value: "USER", label: "User" },
      { value: "ROLE", label: "Role" },
      { value: "DEPARTMENT", label: "Department" },
      { value: "POSITION", label: "Position code" },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Assignments</h2>

      {assignments.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <span className="text-slate-800">
                {labelAssignment(a)}
                {a.dueAt ? (
                  <span className="ml-2 text-slate-500">· Due {new Date(a.dueAt).toLocaleString()}</span>
                ) : null}
              </span>
              <form action={deleteCourseAssignmentAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="assignmentId" value={a.id} />
                <button type="submit" className="text-xs text-rose-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">No assignments yet.</p>
      )}

      <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <input type="hidden" name="courseId" value={courseId} />
        <p className="text-sm font-medium text-slate-800">Assign to</p>

        <select
          name="targetType"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {targetType === "USER" ? (
          <select name="targetUserId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </select>
        ) : null}

        {targetType === "ROLE" ? (
          <select name="targetRoleId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : null}

        {targetType === "DEPARTMENT" ? (
          <select name="targetDepartmentId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : null}

        {targetType === "POSITION" ? (
          <input
            name="targetPosition"
            placeholder="positionCode on user profile"
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        ) : null}

        <div>
          <label className="text-xs text-slate-600">Due date (optional)</label>
          <input type="datetime-local" name="dueAt" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : "Create assignment"}
        </button>
      </form>
    </div>
  );
}
