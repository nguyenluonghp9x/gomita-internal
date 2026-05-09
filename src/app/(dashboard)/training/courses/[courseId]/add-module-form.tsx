"use client";

import { useActionState } from "react";

import { addModuleAction, type ActionMessage } from "@/app/(dashboard)/training/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function AddModuleForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(addModuleAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm font-medium text-slate-800">Add module</p>
      <input name="title" required placeholder="Module title" className="w-full rounded-md border px-3 py-2 text-sm" />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add module"}
      </button>
    </form>
  );
}
