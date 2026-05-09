"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createQuotationAction,
  type CreateQuotationResult,
  submitQuotationAction,
  updateQuotationDraftAction,
} from "@/app/(dashboard)/quotations/actions";
import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { QUOTATION_VAT_RATE } from "@/lib/constants/quotation";
import {
  buildLineRows,
  computeTotalsFromLines,
  type QuotationLineInput,
} from "@/lib/quotation/compute";
import { formatVnd } from "@/lib/utils/money";

export type QuotationTemplateOption = { id: string; code: string; name: string };
export type QuotationFormulaOption = { id: string; name: string; versionNo: number };

type LineRow = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  estimatedCost: string;
};

function emptyLine(): LineRow {
  return { name: "", quantity: "1", unit: "", unitPrice: "0", estimatedCost: "" };
}

function toJsonPayload(lines: LineRow[]) {
  return JSON.stringify(
    lines.map((l) => ({
      name: l.name,
      quantity: Number(l.quantity) || 0,
      unit: l.unit || undefined,
      unitPrice: Number(l.unitPrice) || 0,
      estimatedCost: l.estimatedCost === "" ? undefined : Number(l.estimatedCost),
    })),
  );
}

function linesToInputs(lines: LineRow[]): QuotationLineInput[] {
  const parsed = JSON.parse(toJsonPayload(lines)) as {
    name: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    estimatedCost?: number;
  }[];
  return parsed
    .filter((x) => x.name?.trim())
    .map((x) => ({
      name: x.name,
      quantity: x.quantity,
      unit: x.unit,
      unitPrice: x.unitPrice,
      estimatedCost: x.estimatedCost,
    }));
}

const msgInit: ActionMessage = { ok: true, message: "" };

export function QuotationCreateForm({
  templates,
  formulas,
}: {
  templates: QuotationTemplateOption[];
  formulas: QuotationFormulaOption[];
}) {
  const router = useRouter();
  const init: CreateQuotationResult = { ok: true, message: "", quotationId: undefined };
  const [state, formAction, pending] = useActionState(createQuotationAction, init);

  useEffect(() => {
    if (state.ok && state.quotationId) {
      router.push(`/quotations/${state.quotationId}/edit`);
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      {state.message && !state.ok ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.message}</p>
      ) : null}
      <QuotationFieldsInner
        templates={templates}
        formulas={formulas}
        formAction={formAction}
        pending={pending}
        quotationId={undefined}
        canViewCost
        initialLines={[emptyLine()]}
        initialHeader={{
          customerName: "",
          projectType: "",
          scope: "",
          notes: "",
          templateId: "",
          formulaConfigId: "",
          discountPercent: 0,
          discountReason: "",
        }}
      />
    </div>
  );
}

export function QuotationEditForm({
  quotationId,
  templates,
  formulas,
  canViewCost,
  initialHeader,
  initialLines,
}: {
  quotationId: string;
  templates: QuotationTemplateOption[];
  formulas: QuotationFormulaOption[];
  canViewCost: boolean;
  initialHeader: {
    customerName: string;
    projectType: string;
    scope: string;
    notes: string;
    templateId: string;
    formulaConfigId: string;
    discountPercent: number;
    discountReason: string;
  };
  initialLines: LineRow[];
}) {
  const [draftState, saveAction, draftPending] = useActionState(updateQuotationDraftAction, msgInit);
  const [submitState, submitAction, submitPending] = useActionState(submitQuotationAction, msgInit);
  const busy = draftPending || submitPending;
  const flashText = submitState.message || draftState.message;
  const flashOk = submitState.message ? submitState.ok : draftState.ok;

  return (
    <div className="space-y-4">
      {flashText ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            flashOk ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {flashText}
        </p>
      ) : null}
      <QuotationFieldsInner
        templates={templates}
        formulas={formulas}
        quotationId={quotationId}
        canViewCost={canViewCost}
        initialLines={initialLines.length ? initialLines : [emptyLine()]}
        initialHeader={initialHeader}
        formAction={saveAction}
        pending={busy}
        extraActions={
          <button
            type="submit"
            formAction={submitAction}
            disabled={busy}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitPending ? "Submitting…" : "Submit for approval"}
          </button>
        }
      />
    </div>
  );
}

function QuotationFieldsInner({
  templates,
  formulas,
  quotationId,
  initialHeader,
  initialLines,
  formAction,
  pending,
  canViewCost,
  extraActions,
}: {
  templates: QuotationTemplateOption[];
  formulas: QuotationFormulaOption[];
  quotationId?: string;
  initialHeader: {
    customerName: string;
    projectType: string;
    scope: string;
    notes: string;
    templateId: string;
    formulaConfigId: string;
    discountPercent: number;
    discountReason: string;
  };
  initialLines: LineRow[];
  formAction: (payload: FormData) => void;
  pending: boolean;
  canViewCost: boolean;
  extraActions?: React.ReactNode;
}) {
  const [lines, setLines] = useState<LineRow[]>(initialLines);
  const linesJson = useMemo(() => toJsonPayload(lines), [lines]);
  const [discountPct, setDiscountPct] = useState(initialHeader.discountPercent);

  const previewTotals = useMemo(() => {
    try {
      const inputs = linesToInputs(lines);
      if (inputs.length === 0) return null;
      const built = buildLineRows(inputs);
      const disc = Math.min(95, Math.max(0, discountPct)) / 100;
      return computeTotalsFromLines(built, disc);
    } catch {
      return null;
    }
  }, [lines, discountPct]);

  const taxablePreview =
    previewTotals != null ? Math.round(previewTotals.subtotal * (1 - Math.min(95, Math.max(0, discountPct)) / 100)) : 0;

  return (
    <form action={formAction} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      {quotationId ? <input type="hidden" name="quotationId" value={quotationId} /> : null}
      <input type="hidden" name="linesJson" value={linesJson} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Customer</label>
          <input
            name="customerName"
            required
            defaultValue={initialHeader.customerName}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Project type</label>
          <input
            name="projectType"
            required
            defaultValue={initialHeader.projectType}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">Scope</label>
          <textarea
            name="scope"
            rows={2}
            defaultValue={initialHeader.scope}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initialHeader.notes}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Template</label>
          <select
            name="templateId"
            defaultValue={initialHeader.templateId}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Formula config</label>
          <select
            name="formulaConfigId"
            defaultValue={initialHeader.formulaConfigId}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (v{f.versionNo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Discount % (0–95)</label>
          <input
            name="discountPercent"
            type="number"
            min={0}
            max={95}
            step={0.1}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            VAT {QUOTATION_VAT_RATE * 100}% on taxable amount after discount. Discount &gt; 0 requires manager approval.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Discount reason</label>
          <input
            name="discountReason"
            defaultValue={initialHeader.discountReason}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Line items</h3>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            + Add line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Unit price</th>
                {canViewCost ? <th className="px-2 py-2">Est. cost</th> : null}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1">
                    <input
                      value={line.name}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, name: e.target.value } : l)))
                      }
                      className="w-full min-w-[140px] rounded border px-2 py-1 text-sm"
                      placeholder="Item name"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))
                      }
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={line.unit}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unit: e.target.value } : l)))
                      }
                      className="w-24 rounded border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={line.unitPrice}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitPrice: e.target.value } : l)))
                      }
                      className="w-28 rounded border px-2 py-1 text-sm"
                    />
                  </td>
                  {canViewCost ? (
                    <td className="px-2 py-1">
                      <input
                        value={line.estimatedCost}
                        onChange={(e) =>
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, estimatedCost: e.target.value } : l)))
                        }
                        className="w-28 rounded border px-2 py-1 text-sm"
                        placeholder="auto"
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline disabled:opacity-40"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewTotals ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Preview</p>
          <ul className="mt-2 grid gap-1 text-slate-700 md:grid-cols-2">
            <li>Subtotal: {formatVnd(previewTotals.subtotal)}</li>
            <li>After discount (taxable): {formatVnd(taxablePreview)}</li>
            <li>VAT: {formatVnd(previewTotals.vatAmount)}</li>
            <li className="font-semibold">Total: {formatVnd(previewTotals.totalAmount)}</li>
            {canViewCost ? (
              <>
                <li>Estimated cost: {formatVnd(previewTotals.estimatedCost)}</li>
                <li>Expected profit: {formatVnd(previewTotals.expectedProfit)}</li>
              </>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : quotationId ? "Save draft" : "Create draft"}
        </button>
        {extraActions}
      </div>
    </form>
  );
}
