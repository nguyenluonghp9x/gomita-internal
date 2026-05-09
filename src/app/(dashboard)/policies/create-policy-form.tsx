"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { createPolicyAction } from "@/app/(dashboard)/policies/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function CreatePolicyForm() {
  const [state, formAction, pending] = useActionState(createPolicyAction, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Title</label>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g. Code of conduct"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Issuing authority (optional)</label>
        <input
          name="issuingAuthority"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g. HR / Board"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Content</label>
        <textarea
          name="content"
          required
          rows={14}
          className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
          placeholder="Plain text or lightweight markup (v1)."
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" className="rounded border" />
        Publish immediately (otherwise saved as draft)
      </label>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
