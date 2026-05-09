"use server";

import { revalidatePath } from "next/cache";
import { NotificationType, PolicyStatus } from "@prisma/client";
import { headers } from "next/headers";

import type { ActionMessage } from "@/app/(dashboard)/training/actions";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  addPolicyVersion,
  createPolicyWithFirstVersion,
  getPolicyWithVersions,
  publishDraftPolicy,
  updateDraftPolicyContent,
} from "@/server/services/policy-service";

export async function acknowledgePolicyAction(
  _: ActionMessage,
  formData: FormData,
): Promise<ActionMessage> {
  const user = await requirePermission("policies.ack");
  const policyId = String(formData.get("policyId") ?? "").trim();
  const versionNo = Number(formData.get("versionNo") ?? "");
  if (!policyId || !Number.isFinite(versionNo)) {
    return { ok: false, message: "Invalid form" };
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy || policy.status !== "PUBLISHED") {
    return { ok: false, message: "Policy not available" };
  }
  if (policy.latestVersionNo !== versionNo) {
    return { ok: false, message: "This policy was updated. Please refresh the page." };
  }

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent") ?? undefined;

  await prisma.policyAcknowledgement.upsert({
    where: {
      policyId_policyVersionNo_userId: {
        policyId,
        policyVersionNo: versionNo,
        userId: user.id,
      },
    },
    create: {
      policyId,
      policyVersionNo: versionNo,
      userId: user.id,
      ipAddress: ipAddress || null,
      userAgent: userAgent ?? null,
    },
    update: {},
  });

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      type: NotificationType.POLICY_ACK_REQUIRED,
      readAt: null,
      route: `/policies/${policyId}`,
    },
    data: { readAt: new Date() },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "ACK_POLICY",
    module: "policies",
    resource: "policy",
    resourceId: policyId,
    metadata: { versionNo },
    ipAddress: ipAddress || undefined,
    userAgent,
  });

  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");

  return { ok: true, message: "Acknowledgement recorded." };
}

export async function createPolicyAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("policies.create");
  const title = String(formData.get("title") ?? "").trim();
  const issuingAuthority = String(formData.get("issuingAuthority") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const publish = String(formData.get("publish") ?? "") === "on";

  if (title.length < 2) return { ok: false, message: "Title is required" };
  if (content.length < 10) return { ok: false, message: "Content is too short" };

  await createPolicyWithFirstVersion({
    title,
    issuingAuthority: issuingAuthority || null,
    content,
    status: publish ? PolicyStatus.PUBLISHED : PolicyStatus.DRAFT,
    effectiveAt: null,
    updatedById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "policies",
    resource: "policy",
    metadata: { title, publish },
  });

  revalidatePath("/policies");
  revalidatePath("/dashboard");
  return { ok: true, message: publish ? "Policy published." : "Draft saved." };
}

export async function addPolicyVersionAction(
  _: ActionMessage,
  formData: FormData,
): Promise<ActionMessage> {
  const actor = await requirePermission("policies.update");
  const policyId = String(formData.get("policyId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!policyId) return { ok: false, message: "Missing policy" };
  if (content.length < 10) return { ok: false, message: "Content is too short" };

  const existing = await getPolicyWithVersions(policyId);
  if (!existing) return { ok: false, message: "Policy not found" };

  try {
    await addPolicyVersion({
      policyId,
      content,
      effectiveAt: null,
      updatedById: actor.id,
    });
  } catch (e) {
    const msg = e instanceof Error && e.message === "DRAFT_USE_UPDATE"
      ? "Draft policies cannot add a new version — publish the draft or edit v1 below."
      : "Could not save version.";
    return { ok: false, message: msg };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "policies",
    resource: "policy_version",
    resourceId: policyId,
  });

  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "New version published. Acknowledgement required from staff." };
}

export async function publishDraftAction(_: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const actor = await requirePermission("policies.update");
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!policyId) return { ok: false, message: "Missing policy" };

  try {
    await publishDraftPolicy(policyId, actor.id);
  } catch {
    return { ok: false, message: "Could not publish (not a draft or missing content)." };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "policies",
    resource: "policy",
    resourceId: policyId,
    metadata: { action: "publish_draft" },
  });

  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Draft published. Notifications sent for acknowledgement." };
}

export async function updateDraftContentAction(
  _: ActionMessage,
  formData: FormData,
): Promise<ActionMessage> {
  const actor = await requirePermission("policies.update");
  const policyId = String(formData.get("policyId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!policyId) return { ok: false, message: "Missing policy" };
  if (content.length < 10) return { ok: false, message: "Content is too short" };

  try {
    await updateDraftPolicyContent(policyId, content, actor.id);
  } catch {
    return { ok: false, message: "Only draft policies can be edited in place." };
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "OTHER",
    module: "policies",
    resource: "policy",
    resourceId: policyId,
    metadata: { action: "update_draft" },
  });

  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  return { ok: true, message: "Draft updated." };
}
