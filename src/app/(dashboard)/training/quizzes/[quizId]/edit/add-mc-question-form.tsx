"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { addMcQuestionAction } from "@/app/(dashboard)/training/quiz-actions";

const initial: ActionMessage = { ok: true, message: "" };

export function AddMcQuestionForm({ quizId, courseId }: { quizId: string; courseId: string }) {
  const [state, formAction, pending] = useActionState(addMcQuestionAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <input type="hidden" name="quizId" value={quizId} />
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm font-semibold text-slate-900">Multiple choice question</p>
      <textarea
        name="question"
        required
        rows={2}
        placeholder="Question"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="opt0" placeholder="Option A" className="rounded-md border px-3 py-2 text-sm" required />
        <input name="opt1" placeholder="Option B" className="rounded-md border px-3 py-2 text-sm" required />
        <input name="opt2" placeholder="Option C (optional)" className="rounded-md border px-3 py-2 text-sm" />
        <input name="opt3" placeholder="Option D (optional)" className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-600">Correct option index (0=A)</label>
          <input
            name="correctIndex"
            type="number"
            min={0}
            max={3}
            defaultValue={0}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Points</label>
          <input
            name="point"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Add question"}
      </button>
    </form>
  );
}
