import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddDocumentVersionForm } from "@/app/(dashboard)/documents/add-version-form";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { getDocumentById, getMaxUploadBytes } from "@/server/services/document-service";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requirePermission("documents.view");
  const canCreate = await hasPermission(user.id, "documents.create");
  const canUpdate = await hasPermission(user.id, "documents.update");
  const canAddVersion = canCreate || canUpdate;
  const canDownload = await hasPermission(user.id, "documents.download");
  const maxMb = Math.round(getMaxUploadBytes() / 1024 / 1024);

  const doc = await getDocumentById(documentId);
  if (!doc) notFound();

  const published = doc.status === "PUBLISHED";
  if (!published && !canCreate) redirect("/unauthorized");

  const latest = doc.versions[0];
  const fileUrl = latest
    ? `/api/documents/versions/${latest.id}/file?mode=inline`
    : null;
  const downloadUrl =
    latest && doc.isDownloadable && canDownload
      ? `/api/documents/versions/${latest.id}/file?mode=download`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/documents" className="text-sm text-slate-600 hover:underline">
          Back to library
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-600">
          {doc.category ? <span>Category: {doc.category}</span> : null}
          <span>Status: {doc.status}</span>
          {doc.isSensitive ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">Sensitive</span>
          ) : null}
        </div>
        {doc.tags.length > 0 ? (
          <p className="mt-2 text-sm text-slate-600">Tags: {doc.tags.join(", ")}</p>
        ) : null}
      </div>

      {doc.isSensitive ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Internal viewing · Audited access. Viewer context is recorded.
        </div>
      ) : null}

      {latest ? (
        <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Latest version (v{latest.versionNo})</h2>
          <p className="text-sm text-slate-600">
            {latest.fileName} · {(latest.fileSize / 1024).toFixed(1)} KB · {latest.fileMime}
          </p>
          <div className="flex flex-wrap gap-3">
            {fileUrl && latest.fileMime === "application/pdf" ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Open PDF
              </a>
            ) : fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Open file
              </a>
            ) : null}
            {downloadUrl ? (
              <a
                href={downloadUrl}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Download
              </a>
            ) : !doc.isDownloadable ? (
              <span className="text-sm text-slate-500">Download disabled for this document</span>
            ) : !canDownload ? (
              <span className="text-sm text-slate-500">No download permission</span>
            ) : null}
          </div>
          {latest.fileMime === "application/pdf" && fileUrl ? (
            <iframe title="Preview" src={fileUrl} className="mt-4 h-[70vh] w-full rounded-md border" />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">No file versions.</p>
      )}

      {canAddVersion ? (
        <AddDocumentVersionForm documentId={doc.id} maxMb={maxMb} />
      ) : null}

      <div className="rounded-xl border bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Version history</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {doc.versions.map((v) => (
            <li key={v.id}>
              v{v.versionNo} · {v.fileName}
              {v.changeSummary ? ` · ${v.changeSummary}` : ""} · {new Date(v.createdAt).toLocaleString()} ·{" "}
              {v.createdBy.fullName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
