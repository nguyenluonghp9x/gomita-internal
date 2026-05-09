import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  listAllPoliciesForManagement,
  listPendingAcknowledgementsForUser,
  listPublishedPolicies,
} from "@/server/services/policy-service";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("policies.view");
  const { q } = await searchParams;

  const [canCreate, canEdit, canAck, published] = await Promise.all([
    hasPermission(user.id, "policies.create"),
    hasPermission(user.id, "policies.update"),
    hasPermission(user.id, "policies.ack"),
    listPublishedPolicies({ q }),
  ]);

  const [pendingAck, manage] = await Promise.all([
    canAck ? listPendingAcknowledgementsForUser(user.id) : Promise.resolve([]),
    canCreate || canEdit ? listAllPoliciesForManagement() : Promise.resolve([]),
  ]);

  const showManage = manage.length > 0 && (canCreate || canEdit);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Policies</h1>
          <p className="mt-1 text-sm text-slate-600">
            Published internal policies. Acknowledgement may be required when a new version is issued.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/policies/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New policy
          </Link>
        ) : null}
      </div>

      {pendingAck.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Awaiting your acknowledgement</h2>
          <ul className="mt-3 space-y-2">
            {pendingAck.map((p) => (
              <li key={p.id}>
                <Link href={`/policies/${p.id}`} className="font-medium text-amber-900 underline-offset-2 hover:underline">
                  {p.title}
                </Link>
                <span className="ml-2 text-xs text-amber-800">v{p.latestVersionNo}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Published</h2>
        <form method="get" action="/policies" className="mt-3 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title or authority"
            className="min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Search
          </button>
        </form>
        {published.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No published policies yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {published.map((p) => {
              const needsAck = pendingAck.some((x) => x.id === p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={`/policies/${p.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.issuingAuthority ? (
                      <span className="ml-2 text-xs text-slate-500">{p.issuingAuthority}</span>
                    ) : null}
                    {needsAck ? (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Ack required</span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500">v{p.latestVersionNo}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showManage ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">All policies (management)</h2>
          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full text-left">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {manage.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <Link href={`/policies/${row.id}`} className="font-medium text-slate-800 hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">v{row.latestVersionNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
