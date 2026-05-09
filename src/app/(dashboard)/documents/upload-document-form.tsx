"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { uploadDocumentAction } from "@/app/(dashboard)/documents/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function UploadDocumentForm({ maxMb }: { maxMb: number }) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initial);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Upload document</h2>
      <p className="text-xs text-slate-500">Max {maxMb} MB · PDF, images, TXT, DOCX</p>

      <input name="title" required placeholder="Title" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="category" placeholder="Category (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="tags" placeholder="Tags (comma-separated)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="changeSummary" placeholder="Change summary (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />

      <input type="file" name="file" required className="w-full text-sm" />

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publish" className="rounded border" />
          Publish immediately
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="downloadable" defaultChecked className="rounded border" />
          Allow download
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="sensitive" className="rounded border" />
          Sensitive (audit view)
        </label>
      </div>

      {state.message && !state.ok ? <p className="text-sm text-rose-600">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
