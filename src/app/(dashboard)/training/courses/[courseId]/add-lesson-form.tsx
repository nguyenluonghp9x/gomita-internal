"use client";

import { useActionState } from "react";

import { addLessonAction, type ActionMessage } from "@/app/(dashboard)/training/actions";

const initial: ActionMessage = { ok: true, message: "" };

type ModuleOption = { id: string; title: string };

export function AddLessonForm({ courseId, modules }: { courseId: string; modules: ModuleOption[] }) {
  const [state, formAction, pending] = useActionState(addLessonAction, initial);

  if (modules.length === 0) {
    return <p className="text-sm text-slate-500">Add a module before creating lessons.</p>;
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm font-medium text-slate-800">Add lesson</p>
      <select name="courseModuleId" required className="w-full rounded-md border px-3 py-2 text-sm">
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <input name="title" required placeholder="Lesson title" className="w-full rounded-md border px-3 py-2 text-sm" />
      <select name="type" className="w-full rounded-md border px-3 py-2 text-sm">
        <option value="ARTICLE">Article</option>
        <option value="VIDEO">Video</option>
        <option value="PDF">PDF</option>
        <option value="SLIDE">Slide</option>
        <option value="DOWNLOAD">Download</option>
      </select>
      <textarea name="content" rows={3} placeholder="Content (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="mediaUrl" placeholder="Media URL (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="estimatedMin" type="number" min={1} placeholder="Minutes (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" name="downloadable" className="rounded border" />
        Downloadable
      </label>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add lesson"}
      </button>
    </form>
  );
}
