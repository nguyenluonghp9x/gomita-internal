import Link from "next/link";

import { AuditAction } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import { AUDIT_LOG_PAGE_SIZE, listAuditLogs } from "@/server/services/audit-log-service";

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildQuery(
  base: {
    q?: string;
    module?: string;
    action?: string;
    from?: string;
    to?: string;
  },
  page: number,
): string {
  const p = new URLSearchParams();
  if (base.q?.trim()) p.set("q", base.q.trim());
  if (base.module?.trim()) p.set("module", base.module.trim());
  if (base.action?.trim()) p.set("action", base.action.trim());
  if (base.from?.trim()) p.set("from", base.from.trim());
  if (base.to?.trim()) p.set("to", base.to.trim());
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    module?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requirePermission("audit_logs.view");
  const sp = await searchParams;

  const filterState = {
    q: sp.q,
    module: sp.module,
    action: sp.action,
    from: sp.from,
    to: sp.to,
  };

  const { rows, total, page, totalPages } = await listAuditLogs({
    ...filterState,
    page: sp.page ? Number(sp.page) : undefined,
  });

  const actionOptions = Object.values(AuditAction) as AuditAction[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Immutable trail of security-relevant actions (login, document access, policy acknowledgement, etc.).
        </p>
      </div>

      <form
        method="get"
        action="/admin/audit-logs"
        className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:flex-wrap md:items-end"
      >
        <div className="min-w-[160px] flex-1">
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Resource, actor, module…"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-slate-600">Module contains</label>
          <input
            name="module"
            defaultValue={sp.module ?? ""}
            placeholder="e.g. policies"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600">Action</label>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[130px]">
          <label className="block text-xs font-medium text-slate-600">From date</label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[130px]">
          <label className="block text-xs font-medium text-slate-600">To date</label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Apply filters
        </button>
        <Link
          href="/admin/audit-logs"
          className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm text-slate-700 hover:bg-slate-50"
        >
          Reset
        </Link>
      </form>

      <p className="text-sm text-slate-600">
        {total === 0 ? "No matching events." : `Showing ${rows.length} of ${total} events (page ${page} of ${totalPages}).`}
      </p>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Module / resource</th>
              <th className="px-3 py-2">Resource ID</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-800">
                  {row.actor ? (
                    <>
                      <span className="font-medium">{row.actor.fullName}</span>
                      <br />
                      <span className="text-xs text-slate-500">{row.actor.email}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-800">{row.action}</td>
                <td className="px-3 py-2 text-slate-700">
                  <span className="font-medium">{row.module}</span>
                  <span className="text-slate-400"> / </span>
                  {row.resource}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-slate-600" title={row.resourceId ?? ""}>
                  {row.resourceId ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{row.ipAddress ?? "—"}</td>
                <td className="max-w-xs px-3 py-2">
                  {row.metadata != null ? (
                    <details className="cursor-pointer text-xs">
                      <summary className="text-slate-600">JSON</summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-800">
                        {formatJson(row.metadata)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  {row.userAgent ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500" title={row.userAgent}>
                      {row.userAgent}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/audit-logs${buildQuery(filterState, page - 1)}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              prefetch={false}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/audit-logs${buildQuery(filterState, page + 1)}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              prefetch={false}
            >
              Next
            </Link>
          ) : null}
          <span className="text-slate-600">
            Page {page} / {totalPages} · {AUDIT_LOG_PAGE_SIZE} per page
          </span>
        </div>
      ) : null}
    </div>
  );
}
