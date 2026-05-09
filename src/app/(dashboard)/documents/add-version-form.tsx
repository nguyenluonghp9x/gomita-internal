"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { uploadNewDocumentVersionAction } from "@/app/(dashboard)/documents/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function AddDocumentVersionForm({
  documentId,
  maxMb,
}: {
  documentId: string;
  maxMb: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(uploadNewDocumentVersionAction, initial);

  useEffect(() => {
    if (state.ok && state.message === "New version uploaded") {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <input type="hidden" name="documentId" value={documentId} />
      <h3 className="text-sm font-semibold text-slate-900">Upload new version</h3>
      <p className="text-xs text-slate-500">Max {maxMb} MB · same allowed types as new document</p>
      <input name="changeSummary" placeholder="What changed (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input type="file" name="file" required className="w-full text-sm" />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Uploading..." : "Add version"}
      </button>
    </form>
  );
}
