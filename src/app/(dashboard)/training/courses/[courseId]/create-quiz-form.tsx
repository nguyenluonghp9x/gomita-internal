"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { createQuizAction } from "@/app/(dashboard)/training/quiz-actions";

const initial: ActionMessage = { ok: true, message: "" };

export function CreateQuizForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createQuizAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm font-medium text-slate-800">New quiz</p>
      <input name="title" required placeholder="Quiz title" className="w-full rounded-md border px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-600">Pass score (%)</label>
          <input
            name="passScore"
            type="number"
            min={0}
            max={100}
            defaultValue={70}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Max attempts</label>
          <input
            name="maxAttempts"
            type="number"
            min={1}
            max={20}
            defaultValue={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      {!state.ok && state.message ? <p className="text-sm text-rose-600">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create quiz"}
      </button>
    </form>
  );
}
