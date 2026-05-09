"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { addEssayQuestionAction } from "@/app/(dashboard)/training/quiz-actions";

const initial: ActionMessage = { ok: true, message: "" };

export function AddEssayQuestionForm({ quizId, courseId }: { quizId: string; courseId: string }) {
  const [state, formAction, pending] = useActionState(addEssayQuestionAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <input type="hidden" name="quizId" value={quizId} />
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm font-semibold text-slate-900">Short essay (auto partial credit)</p>
      <textarea
        name="question"
        required
        rows={2}
        placeholder="Question"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <div>
        <label className="text-xs text-slate-600">Points</label>
        <input
          name="point"
          type="number"
          min={1}
          max={100}
          defaultValue={2}
          className="mt-1 w-full max-w-xs rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-60"
      >
        {pending ? "Saving..." : "Add essay question"}
      </button>
    </form>
  );
}
