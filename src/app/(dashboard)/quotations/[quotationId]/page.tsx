import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotationStatus } from "@prisma/client";

import {
  approveQuotationPlainAction,
  changeQuotationStatusPlainAction,
  rejectQuotationPlainAction,
} from "@/app/(dashboard)/quotations/actions";
import { requirePermission } from "@/lib/auth/session";
import {
  quotationStatusBadgeClass,
  quotationStatusLabel,
} from "@/lib/quotation/status";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatVnd } from "@/lib/utils/money";
import {
  getQuotationById,
  getQuotationStatusTimeline,
} from "@/server/services/quotation-service";

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ quotationId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await requirePermission("quotations.view");
  const { quotationId } = await params;
  const { notice, error } = await searchParams;

  const q = await getQuotationById(quotationId);
  if (!q) notFound();

  const [canUpdate, canApprove, canViewCost, canExport] = await Promise.all([
    hasPermission(user.id, "quotations.update"),
    hasPermission(user.id, "quotations.approve_discount"),
    hasPermission(user.id, "quotations.view_cost"),
    hasPermission(user.id, "quotations.export"),
  ]);
  const timeline = await getQuotationStatusTimeline(quotationId);
  const canManageThisQuotation = canApprove || q.createdById === user.id;

  const pendingApproval = q.status === QuotationStatus.PENDING_APPROVAL;
  const isDraft = q.status === QuotationStatus.DRAFT;
  const pendingRow = q.approvals.find((a) => a.status === "PENDING");
  const showApprovePanel = pendingApproval && canApprove && Boolean(pendingRow);
  const canAdvanceCommercialStatus =
    canUpdate &&
    canManageThisQuotation &&
    (q.status === QuotationStatus.APPROVED ||
      q.status === QuotationStatus.SENT ||
      q.status === QuotationStatus.NEGOTIATING);

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/quotations" className="text-sm text-slate-600 hover:text-slate-900">
          All quotations
        </Link>
        {isDraft && canUpdate ? (
          <>
            <span className="text-slate-300">|</span>
            <Link
              href={`/quotations/${quotationId}/edit`}
              className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              Edit draft
            </Link>
          </>
        ) : null}
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{q.code}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${quotationStatusBadgeClass(q.status)}`}
            >
              {quotationStatusLabel(q.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{q.customerName}</p>
          <p className="text-sm text-slate-600">Project: {q.projectType}</p>
        </div>
        {canExport ? (
          <a
            href={`/api/quotations/${quotationId}/pdf`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Export PDF
          </a>
        ) : null}
      </header>

      {showApprovePanel ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-950">Discount approval</h2>
          <p className="mt-1 text-sm text-amber-900">
            Requested discount: {(Number(q.discountPercent) * 100).toFixed(2)}%
            {q.discountReason ? ` — ${q.discountReason}` : ""}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <form action={approveQuotationPlainAction} className="space-y-2 rounded-lg border border-emerald-200 bg-white p-3">
              <input type="hidden" name="quotationId" value={quotationId} />
              <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
              <textarea name="note" rows={2} className="w-full rounded-md border px-2 py-1 text-sm" />
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Approve
              </button>
            </form>
            <form action={rejectQuotationPlainAction} className="space-y-2 rounded-lg border border-rose-200 bg-white p-3">
              <input type="hidden" name="quotationId" value={quotationId} />
              <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
              <textarea name="note" rows={2} className="w-full rounded-md border px-2 py-1 text-sm" />
              <button
                type="submit"
                className="w-full rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800"
              >
                Reject (return to draft)
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {canAdvanceCommercialStatus ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <h2 className="text-lg font-semibold text-sky-950">Commercial workflow</h2>
          <p className="mt-1 text-sm text-sky-900">
            Move quote status after approval as it progresses with the client.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.status !== QuotationStatus.SENT ? (
              <form action={changeQuotationStatusPlainAction}>
                <input type="hidden" name="quotationId" value={quotationId} />
                <input type="hidden" name="targetStatus" value="SENT" />
                <button className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-sm hover:bg-sky-100">
                  Mark as sent
                </button>
              </form>
            ) : null}
            {q.status !== QuotationStatus.NEGOTIATING ? (
              <form action={changeQuotationStatusPlainAction}>
                <input type="hidden" name="quotationId" value={quotationId} />
                <input type="hidden" name="targetStatus" value="NEGOTIATING" />
                <button className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-sm hover:bg-sky-100">
                  Mark as negotiating
                </button>
              </form>
            ) : null}
            <form action={changeQuotationStatusPlainAction}>
              <input type="hidden" name="quotationId" value={quotationId} />
              <input type="hidden" name="targetStatus" value="WON" />
              <button className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm hover:bg-emerald-100">
                Mark as won
              </button>
            </form>
            <form action={changeQuotationStatusPlainAction}>
              <input type="hidden" name="quotationId" value={quotationId} />
              <input type="hidden" name="targetStatus" value="LOST" />
              <button className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-100">
                Mark as lost
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Totals</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{formatVnd(Number(q.subtotal))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Discount</dt>
              <dd>{(Number(q.discountPercent) * 100).toFixed(2)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">VAT</dt>
              <dd>{formatVnd(Number(q.vatAmount))}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatVnd(Number(q.totalAmount))}</dd>
            </div>
            {canViewCost ? (
              <>
                <div className="flex justify-between border-t pt-2 text-slate-700">
                  <dt>Estimated cost</dt>
                  <dd>{formatVnd(Number(q.estimatedCost))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Expected profit</dt>
                  <dd>{formatVnd(Number(q.expectedProfit))}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Meta</h2>
          <dl className="mt-3 space-y-1 text-sm text-slate-700">
            <div>
              <dt className="text-slate-500">Created by</dt>
              <dd>
                {q.createdBy.fullName} ({q.createdBy.email})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Template</dt>
              <dd>{q.template ? `${q.template.name} (${q.template.code})` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Formula</dt>
              <dd>{q.formulaConfig ? `${q.formulaConfig.name} v${q.formulaConfig.versionNo}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd>{new Date(q.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      {q.scope ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Scope</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{q.scope}</p>
        </div>
      ) : null}

      {q.notes ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{q.notes}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2 text-right">Unit price</th>
              <th className="px-4 py-2 text-right">Line total</th>
              {canViewCost ? (
                <>
                  <th className="px-4 py-2 text-right">Est. cost</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {q.items.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-2">{Number(row.quantity)}</td>
                <td className="px-4 py-2">{row.unit ?? "—"}</td>
                <td className="px-4 py-2 text-right">{formatVnd(Number(row.unitPrice))}</td>
                <td className="px-4 py-2 text-right">{formatVnd(Number(row.lineTotal))}</td>
                {canViewCost ? (
                  <>
                    <td className="px-4 py-2 text-right">{formatVnd(Number(row.estimatedCost))}</td>
                    <td className="px-4 py-2 text-right">{formatVnd(Number(row.projectedProfit))}</td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingRow ? (
        <p className="text-xs text-slate-500">
          Approval request from {new Date(pendingRow.createdAt).toLocaleString()}.
        </p>
      ) : null}

      {pendingApproval && canApprove && !pendingRow ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This quote is marked pending approval but no approval record was found. Resubmit from edit or contact an admin.
        </p>
      ) : null}

      {q.approvals.length > 0 ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Approval history</h2>
          <ul className="mt-3 space-y-2">
            {q.approvals.map((row) => (
              <li key={row.id} className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{quotationStatusLabel(row.status)}</p>
                <p className="text-xs text-slate-500">
                  Requested {new Date(row.createdAt).toLocaleString()}
                  {row.decisionAt ? ` · Decided ${new Date(row.decisionAt).toLocaleString()}` : ""}
                </p>
                {row.reason ? <p className="mt-1 text-xs text-slate-600">Reason: {row.reason}</p> : null}
                {row.decisionNote ? <p className="mt-1 text-xs text-slate-600">Decision note: {row.decisionNote}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Status timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No timeline events yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{event.label}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString()} · {event.actorName}
                  {event.actorEmail ? ` (${event.actorEmail})` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
