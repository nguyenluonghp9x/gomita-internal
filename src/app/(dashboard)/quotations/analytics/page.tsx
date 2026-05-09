import Link from "next/link";
import { QuotationStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatVnd } from "@/lib/utils/money";
import {
  getOutcomesByProjectType,
  getOwnerWinLeaderboard,
  getQuotationWeeklyTrend,
} from "@/server/services/quotation-analytics-service";
import { WeekTrendChart } from "@/app/(dashboard)/quotations/analytics/week-trend-chart";
import {
  getQuotationPipelineHealth,
  getQuotationPipelineStatsFiltered,
  listQuotationOwners,
} from "@/server/services/quotation-service";

function buildQuery(params: {
  q?: string;
  status?: string;
  ownerId?: string;
  fromDate?: string;
  toDate?: string;
  weeks?: string;
}) {
  const qp = new URLSearchParams();
  if (params.q?.trim()) qp.set("q", params.q.trim());
  if (params.status?.trim()) qp.set("status", params.status.trim());
  if (params.ownerId?.trim()) qp.set("ownerId", params.ownerId.trim());
  if (params.fromDate?.trim()) qp.set("fromDate", params.fromDate.trim());
  if (params.toDate?.trim()) qp.set("toDate", params.toDate.trim());
  if (params.weeks?.trim() && params.weeks !== "12") qp.set("weeks", params.weeks.trim());
  return qp.toString();
}

export default async function QuotationAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    ownerId?: string;
    fromDate?: string;
    toDate?: string;
    weeks?: string;
  }>;
}) {
  const user = await requirePermission("quotations.view");
  const { q, status, ownerId, fromDate, toDate, weeks } = await searchParams;
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

  const analyticsFilters = {
    q,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const weekCount = Math.min(52, Math.max(4, Number(weeks) || 12));

  const [buckets, pipeline, health, cohort, leaders, owners] = await Promise.all([
    getQuotationWeeklyTrend(analyticsFilters, weekCount),
    getQuotationPipelineStatsFiltered(scopedFilters),
    getQuotationPipelineHealth(scopedFilters),
    getOutcomesByProjectType(analyticsFilters),
    getOwnerWinLeaderboard(analyticsFilters),
    listQuotationOwners(),
  ]);

  const queryStr = buildQuery({ q, status, ownerId, fromDate, toDate, weeks: String(weekCount) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quotation analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pipeline snapshot with your filters, weekly flow, and simple cohort views.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/quotations"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Back to list
          </Link>
          {canExport ? (
            <a
              href={`/api/quotations/analytics/export-csv${queryStr ? `?${queryStr}` : ""}`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              Export analytics CSV
            </a>
          ) : null}
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

      <form
        method="get"
        action="/quotations/analytics"
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-sm"
      >
        <div className="min-w-[160px] flex-1">
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
          <label className="block text-xs font-medium text-slate-600">From</label>
          <input type="date" name="fromDate" defaultValue={fromDate ?? ""} className="mt-1 rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">To</label>
          <input type="date" name="toDate" defaultValue={toDate ?? ""} className="mt-1 rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Weeks</label>
          <select name="weeks" defaultValue={String(weekCount)} className="mt-1 rounded-md border px-3 py-2 text-sm">
            {[8, 12, 16, 24, 36].map((n) => (
              <option key={n} value={n}>
                {n} weeks
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm">
          Apply
        </button>
        <Link href="/quotations/analytics" className="text-sm text-slate-600 hover:text-slate-900">
          Reset
        </Link>
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

      <WeekTrendChart buckets={buckets} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Won vs lost by project type</h2>
          <p className="mt-0.5 text-xs text-slate-500">Rows use current status and updatedAt window when dates are set.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-600">
                <tr>
                  <th className="py-2 pr-3">Project type</th>
                  <th className="py-2 pr-3 text-right">Won</th>
                  <th className="py-2 text-right">Lost</th>
                </tr>
              </thead>
              <tbody>
                {cohort.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No closed deals in this scope.
                    </td>
                  </tr>
                ) : (
                  cohort.map((row) => (
                    <tr key={row.projectType} className="border-t">
                      <td className="py-2 pr-3 text-slate-800">{row.projectType}</td>
                      <td className="py-2 pr-3 text-right text-emerald-700">{row.won}</td>
                      <td className="py-2 text-right text-rose-700">{row.lost}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top owners by won value</h2>
          <p className="mt-0.5 text-xs text-slate-500">Won deals only · ordered by total amount.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-600">
                <tr>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3 text-right">Wins</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No wins in this scope.
                    </td>
                  </tr>
                ) : (
                  leaders.map((row) => (
                    <tr key={row.userId} className="border-t">
                      <td className="py-2 pr-3 text-slate-800">{row.fullName ?? row.email}</td>
                      <td className="py-2 pr-3 text-right">{row.wonCount}</td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatVnd(Math.round(row.wonTotal))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Share filtered view:{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">/quotations/analytics{queryStr ? `?${queryStr}` : ""}</code>
      </p>
    </div>
  );
}
