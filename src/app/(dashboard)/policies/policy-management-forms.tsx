"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import {
  addPolicyVersionAction,
  publishDraftAction,
  updateDraftContentAction,
} from "@/app/(dashboard)/policies/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function UpdateDraftForm({
  policyId,
  defaultContent,
}: {
  policyId: string;
  defaultContent: string;
}) {
  const [state, formAction, pending] = useActionState(updateDraftContentAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Edit draft (v1)</h2>
      <input type="hidden" name="policyId" value={policyId} />
      <textarea
        name="content"
        required
        rows={12}
        defaultValue={defaultContent}
        className="w-full rounded-md border px-3 py-2 font-mono text-sm"
      />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}

export function PublishDraftForm({ policyId }: { policyId: string }) {
  const [state, formAction, pending] = useActionState(publishDraftAction, initial);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-sm text-emerald-900">Ready to enforce this policy?</p>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-800" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish draft"}
      </button>
    </form>
  );
}

export function AddPolicyVersionForm({ policyId, currentVersionNo }: { policyId: string; currentVersionNo: number }) {
  const [state, formAction, pending] = useActionState(addPolicyVersionAction, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">New version (after v{currentVersionNo})</h2>
      <input type="hidden" name="policyId" value={policyId} />
      <textarea
        name="content"
        required
        rows={12}
        placeholder="Full text of the new version (becomes current and requires acknowledgement)."
        className="w-full rounded-md border px-3 py-2 font-mono text-sm"
      />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create version"}
      </button>
    </form>
  );
}
