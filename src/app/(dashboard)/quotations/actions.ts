"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuotationStatus } from "@prisma/client";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { buildSnapshot, type QuotationLineInput } from "@/lib/quotation/compute";
import { quotationStatusLabel } from "@/lib/quotation/status";
import {
  createQuotationWithItems,
  getQuotationById,
  rejectQuotationDiscount,
  submitQuotationForReview,
  transitionQuotationStatus,
  updateQuotationDraft,
  approveQuotationDiscount,
} from "@/server/services/quotation-service";

async function ensureCanManageQuotation(actorId: string, quotationId: string) {
  const q = await getQuotationById(quotationId);
  if (!q) return { ok: false as const, reason: "NOT_FOUND" };
  const isOwner = q.createdById === actorId;
  const isApprover = await hasPermission(actorId, "quotations.approve_discount");
  if (!isOwner && !isApprover) return { ok: false as const, reason: "FORBIDDEN" };
  return { ok: true as const, quotation: q, isOwner, isApprover };
}

function parseLinesJson(raw: string): QuotationLineInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_LINES_JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("INVALID_LINES");
  const lines: QuotationLineInput[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    const quantity = Math.max(0, Number(r.quantity) || 0);
    const unitPrice = Math.max(0, Number(r.unitPrice) || 0);
    const est = r.estimatedCost;
    lines.push({
      name,
      description: r.description != null ? String(r.description).trim() : undefined,
      quantity,
      unit: r.unit != null ? String(r.unit).trim() : undefined,
      unitPrice,
      estimatedCost: est != null && est !== "" ? Number(est) : undefined,
    });
  }
  if (lines.length === 0) throw new Error("NO_LINES");
  return lines;
}

function readHeader(formData: FormData) {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const formulaConfigId = String(formData.get("formulaConfigId") ?? "").trim();
  const discountPercentRaw = Number(formData.get("discountPercent") ?? 0);
  const discountPercent = Math.min(95, Math.max(0, discountPercentRaw)) / 100;
  const discountReason = String(formData.get("discountReason") ?? "").trim();

  return {
    customerName,
    projectType,
    scope: scope || null,
    notes: notes || null,
    templateId: templateId || null,
    formulaConfigId: formulaConfigId || null,
    discountPercent,
    discountReason: discountReason || null,
  };
}

export type CreateQuotationResult = ActionMessage & { quotationId?: string };

export async function createQuotationAction(_: CreateQuotationResult, formData: FormData): Promise<CreateQuotationResult> {
  const actor = await requirePermission("quotations.create");
  const header = readHeader(formData);
  if (header.customerName.length < 2) return { ok: false, message: "Customer name is required" };
  if (header.projectType.length < 1) return { ok: false, message: "Project type is required" };

  let lines: QuotationLineInput[];
  try {
    lines = parseLinesJson(String(formData.get("linesJson") ?? "[]"));
  } catch {
    return { ok: false, message: "Add at least one valid line item" };
  }

  const snapshot = buildSnapshot(header, lines);

  const q = await createQuotationWithItems({
    snapshot,
    templateId: header.templateId,
    formulaConfigId: header.formulaConfigId,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "CREATE_QUOTATION",
    module: "quotations",
    resource: "quotation",
    resourceId: q.id,
    metadata: { code: q.code },
  });

  revalidatePath("/quotations");
  return { ok: true, message: "Quotation created.", quotationId: q.id };
}

export async function updateQuotationDraftAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("quotations.update");
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  if (!quotationId) return { ok: false, message: "Missing quotation" };

  const access = await ensureCanManageQuotation(actor.id, quotationId);
  if (!access.ok) {
    return { ok: false, message: access.reason === "NOT_FOUND" ? "Quotation not found" : "You cannot edit this quotation" };
  }
  if (access.quotation.status !== QuotationStatus.DRAFT) {
    return { ok: false, message: "Only draft quotations can be edited" };
  }

  const header = readHeader(formData);
  if (header.customerName.length < 2) return { ok: false, message: "Customer name is required" };
  if (header.projectType.length < 1) return { ok: false, message: "Project type is required" };

  let lines: QuotationLineInput[];
  try {
    lines = parseLinesJson(String(formData.get("linesJson") ?? "[]"));
  } catch {
    return { ok: false, message: "Add at least one valid line item" };
  }

  const snapshot = buildSnapshot(header, lines);

  await updateQuotationDraft({
    quotationId,
    snapshot,
    templateId: header.templateId,
    formulaConfigId: header.formulaConfigId,
    actorId: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_QUOTATION",
    module: "quotations",
    resource: "quotation",
    resourceId: quotationId,
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath(`/quotations/${quotationId}/edit`);
  return { ok: true, message: "Draft saved." };
}

export async function submitQuotationAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("quotations.update");
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  if (!quotationId) return { ok: false, message: "Missing quotation" };

  const access = await ensureCanManageQuotation(actor.id, quotationId);
  if (!access.ok) {
    return { ok: false, message: access.reason === "NOT_FOUND" ? "Quotation not found" : "You cannot submit this quotation" };
  }
  if (access.quotation.status !== QuotationStatus.DRAFT) {
    return { ok: false, message: "Only draft quotations can be submitted" };
  }

  const header = readHeader(formData);
  if (header.customerName.length < 2) return { ok: false, message: "Customer name is required" };
  if (header.projectType.length < 1) return { ok: false, message: "Project type is required" };

  let lines: QuotationLineInput[];
  try {
    lines = parseLinesJson(String(formData.get("linesJson") ?? "[]"));
  } catch {
    return { ok: false, message: "Add at least one valid line item" };
  }

  const snapshot = buildSnapshot(header, lines);

  await submitQuotationForReview({
    quotationId,
    actorId: actor.id,
    snapshot,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_QUOTATION",
    module: "quotations",
    resource: "quotation",
    resourceId: quotationId,
    metadata: { action: "submit" },
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath(`/quotations/${quotationId}/edit`);
  return {
    ok: true,
    message:
      snapshot.discountPercent > 0
        ? "Submitted for discount approval."
        : "Quotation approved (no discount approval required).",
  };
}

export async function approveQuotationAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("quotations.approve_discount");
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!quotationId) return { ok: false, message: "Missing quotation" };

  try {
    await approveQuotationDiscount({ quotationId, approverId: actor.id, note: note || null });
  } catch {
    return { ok: false, message: "Cannot approve this quotation." };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "APPROVE_QUOTATION",
    module: "quotations",
    resource: "quotation",
    resourceId: quotationId,
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);
  return { ok: true, message: "Quotation approved." };
}

export async function rejectQuotationAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("quotations.approve_discount");
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!quotationId) return { ok: false, message: "Missing quotation" };

  try {
    await rejectQuotationDiscount({ quotationId, approverId: actor.id, note: note || null });
  } catch {
    return { ok: false, message: "Cannot reject this quotation." };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_QUOTATION",
    module: "quotations",
    resource: "quotation",
    resourceId: quotationId,
    metadata: { action: "reject" },
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath(`/quotations/${quotationId}/edit`);
  return { ok: true, message: "Rejected — quotation returned to draft." };
}

/** Boundaries for `<form action={…}>` (no useActionState previous state). */
export async function approveQuotationPlainAction(formData: FormData) {
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const result = await approveQuotationAction({ ok: true, message: "" }, formData);
  if (!quotationId) return;
  const key = result.ok ? "notice" : "error";
  redirect(`/quotations/${quotationId}?${key}=${encodeURIComponent(result.message)}`);
}

export async function rejectQuotationPlainAction(formData: FormData) {
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const result = await rejectQuotationAction({ ok: true, message: "" }, formData);
  if (!quotationId) return;
  const key = result.ok ? "notice" : "error";
  redirect(`/quotations/${quotationId}?${key}=${encodeURIComponent(result.message)}`);
}

export async function changeQuotationStatusAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("quotations.update");
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const targetRaw = String(formData.get("targetStatus") ?? "").trim();
  if (!quotationId) return { ok: false, message: "Missing quotation" };
  if (!(Object.values(QuotationStatus) as string[]).includes(targetRaw)) {
    return { ok: false, message: "Invalid target status" };
  }

  const access = await ensureCanManageQuotation(actor.id, quotationId);
  if (!access.ok) {
    return { ok: false, message: access.reason === "NOT_FOUND" ? "Quotation not found" : "You cannot change this quotation status" };
  }

  const targetStatus = targetRaw as QuotationStatus;
  try {
    await transitionQuotationStatus({ quotationId, targetStatus });
  } catch {
    return { ok: false, message: "Cannot change status from current state." };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "UPDATE_QUOTATION",
    module: "quotations",
    resource: "quotation_status",
    resourceId: quotationId,
    metadata: { targetStatus },
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);
  return { ok: true, message: `Status updated to ${quotationStatusLabel(targetStatus)}.` };
}

export async function changeQuotationStatusPlainAction(formData: FormData) {
  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const result = await changeQuotationStatusAction({ ok: true, message: "" }, formData);
  if (!quotationId) return;
  const key = result.ok ? "notice" : "error";
  redirect(`/quotations/${quotationId}?${key}=${encodeURIComponent(result.message)}`);
}
