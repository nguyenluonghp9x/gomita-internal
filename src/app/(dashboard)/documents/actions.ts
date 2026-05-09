"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { requireAuth } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  addDocumentVersion,
  createDocumentWithFirstVersion,
  getMaxUploadBytes,
} from "@/server/services/document-service";
import type { ActionMessage } from "@/app/(dashboard)/training/actions";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function uploadDocumentAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("documents.create");

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { ok: false, message: "Title is required" };

  const category = String(formData.get("category") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const publish = String(formData.get("publish") ?? "") === "on";
  const downloadable = String(formData.get("downloadable") ?? "on") === "on";
  const sensitive = String(formData.get("sensitive") ?? "") === "on";
  const changeSummary = String(formData.get("changeSummary") ?? "").trim();

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Please choose a file" };
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    return { ok: false, message: `File exceeds limit (${Math.round(maxBytes / 1024 / 1024)} MB)` };
  }

  const fileMime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(fileMime)) {
    return { ok: false, message: "File type not allowed. Use PDF, images, TXT, or DOCX." };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let documentId: string;
  try {
    const created = await createDocumentWithFirstVersion({
      title,
      category: category || null,
      tags,
      status: publish ? DocumentStatus.PUBLISHED : DocumentStatus.DRAFT,
      isDownloadable: downloadable,
      isSensitive: sensitive,
      changeSummary: changeSummary || null,
      fileName: file.name || "upload",
      fileMime,
      fileSize: file.size,
      body: buf,
      createdById: actor.id,
    });
    documentId = created.documentId;
  } catch (e) {
    if (e instanceof Error && e.message === "FILE_TOO_LARGE") {
      return { ok: false, message: "File too large" };
    }
    throw e;
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_DOC",
    module: "documents",
    resource: "document",
    resourceId: documentId,
    metadata: { event: "document_created" },
  });

  revalidatePath("/documents");
  redirect(`/documents/${documentId}`);
}

export async function uploadNewDocumentVersionAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requireAuth();
  const canEdit =
    (await hasPermission(actor.id, "documents.update")) ||
    (await hasPermission(actor.id, "documents.create"));
  if (!canEdit) {
    return { ok: false, message: "No permission to update documents" };
  }

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { ok: false, message: "Missing document" };

  const changeSummary = String(formData.get("changeSummary") ?? "").trim();
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Please choose a file" };
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    return { ok: false, message: `File exceeds limit (${Math.round(maxBytes / 1024 / 1024)} MB)` };
  }

  const fileMime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(fileMime)) {
    return { ok: false, message: "File type not allowed" };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    await addDocumentVersion({
      documentId,
      changeSummary: changeSummary || null,
      fileName: file.name || "upload",
      fileMime,
      fileSize: file.size,
      body: buf,
      createdById: actor.id,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FILE_TOO_LARGE") {
      return { ok: false, message: "File too large" };
    }
    throw e;
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_DOC",
    module: "documents",
    resource: "document",
    resourceId: documentId,
    metadata: { event: "document_version_added" },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { ok: true, message: "New version uploaded" };
}
