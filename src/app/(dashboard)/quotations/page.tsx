import Link from "next/link";
import { QuotationStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import {
  quotationStatusBadgeClass,
  quotationStatusLabel,
} from "@/lib/quotation/status";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatVnd } from "@/lib/utils/money";
import {
  getQuotationPipelineHealth,
  getQuotationPipelineStatsFiltered,
  listQuotationOwners,
  listQuotationsPaged,
} from "@/server/services/quotation-service";

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildQuery(params: {
  q?: string;
  status?: string;
  ownerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
}) {
  const qp = new URLSearchParams();
  if (params.q?.trim()) qp.set("q", params.q.trim());
  if (params.status?.trim()) qp.set("status", params.status.trim());
  if (params.ownerId?.trim()) qp.set("ownerId", params.ownerId.trim());
  if (params.fromDate?.trim()) qp.set("fromDate", params.fromDate.trim());
  if (params.toDate?.trim()) qp.set("toDate", params.toDate.trim());
  if (params.page?.trim() && params.page !== "1") qp.set("page", params.page.trim());
  return qp.toString();
}

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    ownerId?: string;
    fromDate?: string;
    toDate?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission("quotations.view");
  const { q, status, ownerId, fromDate, toDate, page } = await searchParams;
  const [canCreate, canExport] = await Promise.all([
    hasPermission(user.id, "quotations.create"),
    hasPermission(user.id, "quotations.export"),
  ]);

  const statusFilter =
    status && status !== "ALL" && (Object.values(QuotationStatus) as string[]).includes(status)
      ? (status as QuotationStatus)
      : undefined;

  const scopedFilters = {
    q,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };
  const currentPage = Math.max(1, Number(page) || 1);

  const [quotationPage, pipeline, health, owners] = await Promise.all([
    listQuotationsPaged({
      ...scopedFilters,
      page: currentPage,
      pageSize: 20,
    }),
    getQuotationPipelineStatsFiltered(scopedFilters),
    getQuotationPipelineHealth(scopedFilters),
    listQuotationOwners(),
  ]);
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);

  const keep = { q, status, ownerId };
  const queryNow = buildQuery({ q, status, ownerId, fromDate, toDate });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quotations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Internal quotes: line items, VAT, optional discount approval workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/quotations/analytics"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Analytics
          </Link>
          {canCreate ? (
            <Link
              href="/quotations/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New quotation
            </Link>
          ) : null}
        </div>
      </div>

      <form method="get" action="/quotations" className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <input name="q" defaultValue={q ?? ""} placeholder="Code or customer" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select name="status" defaultValue={status ?? "ALL"} className="mt-1 rounded-md border px-3 py-2 text-sm">
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT">Sent</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Owner</label>
          <select name="ownerId" defaultValue={ownerId ?? ""} className="mt-1 rounded-md border px-3 py-2 text-sm">
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName} ({o.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">From date</label>
          <input
            type="date"
            name="fromDate"
            defaultValue={fromDate ?? ""}
            className="mt-1 rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">To date</label>
          <input
            type="date"
            name="toDate"
            defaultValue={toDate ?? ""}
            className="mt-1 rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm">
          Filter
        </button>
        <Link href="/quotations" className="text-sm text-slate-600 hover:text-slate-900">
          Reset
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(sevenDaysAgo), toDate: formatDateInput(today) })}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Last 7 days
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(thirtyDaysAgo), toDate: formatDateInput(today) })}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Last 30 days
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(quarterStart), toDate: formatDateInput(today) })}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          This quarter
        </Link>
        {canExport ? (
          <a
            href={`/api/quotations/export-csv${queryNow ? `?${queryNow}` : ""}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["All", pipeline.total],
          ["Draft", pipeline.byStatus.DRAFT],
          ["Pending", pipeline.byStatus.PENDING_APPROVAL],
          ["Approved", pipeline.byStatus.APPROVED],
          ["Sent", pipeline.byStatus.SENT],
          ["Negotiating", pipeline.byStatus.NEGOTIATING],
          ["Won", pipeline.byStatus.WON],
          ["Lost", pipeline.byStatus.LOST],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm">
            <p className="text-slate-500">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Win rate", `${health.winRatePct.toFixed(1)}%`],
          ["Loss rate", `${health.lossRatePct.toFixed(1)}%`],
          ["Avg closed deal", formatVnd(Math.round(health.avgClosedDealValue))],
          ["Avg won deal", formatVnd(Math.round(health.avgWonDealValue))],
          ["Avg discount", `${health.avgDiscountAllPct.toFixed(2)}%`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm">
            <p className="text-slate-500">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {quotationPage.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No quotations match your filters.
                </td>
              </tr>
            ) : (
              quotationPage.rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/quotations/${row.id}`} className="font-medium text-slate-900 hover:underline">
                      {row.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.customerName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${quotationStatusBadgeClass(row.status)}`}>
                      {quotationStatusLabel(row.status)}
                    </span>
                    {row.approvals.length > 0 ? (
                      <span className="ml-2 text-xs text-amber-700">approval</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">{formatVnd(Number(row.totalAmount))}</td>
                  <td className="px-4 py-3 text-slate-600">{row.createdBy.fullName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-slate-600">
          Showing {quotationPage.rows.length} of {quotationPage.total} quotations - page {quotationPage.page}/
          {quotationPage.totalPages}
        </p>
        <div className="flex items-center gap-2">
          {quotationPage.page > 1 ? (
            <Link
              href={`/quotations?${buildQuery({
                q,
                status,
                ownerId,
                fromDate,
                toDate,
                page: String(quotationPage.page - 1),
              })}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Previous
            </Link>
          ) : null}
          {quotationPage.page < quotationPage.totalPages ? (
            <Link
              href={`/quotations?${buildQuery({
                q,
                status,
                ownerId,
                fromDate,
                toDate,
                page: String(quotationPage.page + 1),
              })}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
