"use client";

import { useActionState } from "react";

import { createCourseAction, type ActionMessage } from "@/app/(dashboard)/training/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function CreateCourseForm() {
  const [state, formAction, pending] = useActionState(createCourseAction, initial);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Create course</h1>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Title</label>
        <input name="title" required className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Course title" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Topic</label>
        <input name="topic" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Optional topic" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea name="description" rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="publish" className="rounded border" />
        Publish immediately
      </label>
      {!state.ok && state.message ? <p className="text-sm text-rose-600">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create course"}
      </button>
    </form>
  );
}
