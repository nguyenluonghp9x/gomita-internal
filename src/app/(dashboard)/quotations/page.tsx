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
          <h1 className="app-page-title">Quotations</h1>
          <p className="app-page-subtitle">
            Line items, VAT, discounts, and approval workflow - tuned for fast scanning and trusted
            numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotations/analytics" className="app-btn-secondary px-4 py-2">
            Analytics
          </Link>
          {canCreate ? (
            <Link href="/quotations/new" className="app-btn-primary px-4 py-2">
              New quotation
            </Link>
          ) : null}
        </div>
      </div>

      <form method="get" action="/quotations" className="app-filter-panel">
        <div className="min-w-[180px] flex-1">
          <label className="app-label">Search</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Code or customer"
            className="app-input"
          />
        </div>
        <div>
          <label className="app-label">Status</label>
          <select name="status" defaultValue={status ?? "ALL"} className="app-select w-auto min-w-[160px]">
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
          <label className="app-label">Owner</label>
          <select name="ownerId" defaultValue={ownerId ?? ""} className="app-select w-auto min-w-[200px]">
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName} ({o.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="app-label">From date</label>
          <input type="date" name="fromDate" defaultValue={fromDate ?? ""} className="app-input w-auto" />
        </div>
        <div>
          <label className="app-label">To date</label>
          <input type="date" name="toDate" defaultValue={toDate ?? ""} className="app-input w-auto" />
        </div>
        <button type="submit" className="app-btn-secondary px-4 py-2">
          Filter
        </button>
        <Link href="/quotations" className="app-link self-center text-sm">
          Reset
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(sevenDaysAgo), toDate: formatDateInput(today) })}`}
          className="app-link self-center text-sm"
        >
          Last 7 days
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(thirtyDaysAgo), toDate: formatDateInput(today) })}`}
          className="app-link self-center text-sm"
        >
          Last 30 days
        </Link>
        <Link
          href={`/quotations?${buildQuery({ ...keep, fromDate: formatDateInput(quarterStart), toDate: formatDateInput(today) })}`}
          className="app-link self-center text-sm"
        >
          This quarter
        </Link>
        {canExport ? (
          <a
            href={`/api/quotations/export-csv${queryNow ? `?${queryNow}` : ""}`}
            className="app-btn-secondary px-4 py-2 text-sm"
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
          <div key={String(label)} className="app-stat">
            <p className="app-stat-label">{label}</p>
            <p className="app-stat-value">{value}</p>
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
          <div key={String(label)} className="app-stat">
            <p className="app-stat-label">{label}</p>
            <p className="app-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="app-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {quotationPage.rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="app-empty border-0">No quotations match your filters.</div>
                </td>
              </tr>
            ) : (
              quotationPage.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/quotations/${row.id}`}
                      className="font-semibold text-[var(--text-primary)] underline-offset-2 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </td>
                  <td className="text-[var(--text-secondary)]">{row.customerName}</td>
                  <td>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${quotationStatusBadgeClass(row.status)}`}
                    >
                      {quotationStatusLabel(row.status)}
                    </span>
                    {row.approvals.length > 0 ? (
                      <span className="ml-2 text-xs font-medium text-[var(--warning-fg)]">approval</span>
                    ) : null}
                  </td>
                  <td className="text-right font-medium tabular-nums text-[var(--text-primary)]">
                    {formatVnd(Number(row.totalAmount))}
                  </td>
                  <td className="text-[var(--text-muted)]">{row.createdBy.fullName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
        <p>
          Showing {quotationPage.rows.length} of {quotationPage.total} - page {quotationPage.page}/
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
              className="app-btn-secondary px-3 py-1.5 text-sm"
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
              className="app-btn-secondary px-3 py-1.5 text-sm"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
