import Link from "next/link";

import { UploadDocumentForm } from "@/app/(dashboard)/documents/upload-document-form";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getMaxUploadBytes,
  listDocumentsForLibrary,
  listDocumentsForManagement,
} from "@/server/services/document-service";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("documents.view");
  const canCreate = await hasPermission(user.id, "documents.create");
  const { q } = await searchParams;

  const [published, manageList] = await Promise.all([
    listDocumentsForLibrary({ q }),
    canCreate ? listDocumentsForManagement() : Promise.resolve([]),
  ]);

  const maxMb = Math.round(getMaxUploadBytes() / 1024 / 1024);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Document library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Published documents your role can access. Upload requires documents.create.
        </p>
      </div>

      {canCreate ? <UploadDocumentForm maxMb={maxMb} /> : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Published</h2>
        <form method="get" action="/documents" className="mt-3 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title or category"
            className="min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Search
          </button>
        </form>
        {published.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No published documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {published.map((doc) => (
              <li key={doc.id} className="py-3">
                <Link href={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:underline">
                  {doc.title}
                </Link>
                {doc.category ? (
                  <span className="ml-2 text-xs text-slate-500">- {doc.category}</span>
                ) : null}
                {doc.tags.length > 0 ? (
                  <span className="ml-2 text-xs text-slate-500">[{doc.tags.join(", ")}]</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCreate && manageList.length > 0 ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">All documents (management)</h2>
          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full text-left">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Versions</th>
                </tr>
              </thead>
              <tbody>
                {manageList.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="px-3 py-2">
                      <Link href={`/documents/${d.id}`} className="text-slate-900 underline">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{d.status}</td>
                    <td className="px-3 py-2">{d._count.versions}</td>
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
