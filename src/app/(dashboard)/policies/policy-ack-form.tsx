"use client";

import { useActionState } from "react";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { acknowledgePolicyAction } from "@/app/(dashboard)/policies/actions";

const initial: ActionMessage = { ok: true, message: "" };

export function PolicyAckForm({ policyId, versionNo }: { policyId: string; versionNo: number }) {
  const [state, formAction, pending] = useActionState(acknowledgePolicyAction, initial);

  return (
    <form action={formAction} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="policyId" value={policyId} />
      <input type="hidden" name="versionNo" value={String(versionNo)} />
      <p className="text-sm font-medium text-amber-900">Your acknowledgement is required for this version.</p>
      {state.message ? (
        <p className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || state.ok}
        className="mt-3 rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : state.ok ? "Acknowledged" : "I have read and acknowledge"}
      </button>
    </form>
  );
}
