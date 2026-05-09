import { NotificationType, PolicyStatus, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.policy.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function listPublishedPolicies(params?: { q?: string }) {
  const q = params?.q?.trim();

  return prisma.policy.findMany({
    where: {
      status: PolicyStatus.PUBLISHED,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { issuingAuthority: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listAllPoliciesForManagement() {
  return prisma.policy.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        take: 1,
        orderBy: { versionNo: "desc" },
        select: { versionNo: true, createdAt: true },
      },
    },
  });
}

export async function getPolicyWithVersions(policyId: string) {
  return prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        include: {
          updatedBy: { select: { fullName: true, email: true } },
        },
      },
    },
  });
}

export async function getCurrentVersionContent(policyId: string, versionNo: number) {
  return prisma.policyVersion.findUnique({
    where: {
      policyId_versionNo: { policyId, versionNo },
    },
    include: {
      updatedBy: { select: { fullName: true } },
    },
  });
}

export async function hasUserAcknowledgedVersion(userId: string, policyId: string, versionNo: number) {
  const row = await prisma.policyAcknowledgement.findUnique({
    where: {
      policyId_policyVersionNo_userId: {
        policyId,
        policyVersionNo: versionNo,
        userId,
      },
    },
  });
  return Boolean(row);
}

/** Policies the user must still acknowledge (latest published version). */
export async function listPendingAcknowledgementsForUser(userId: string) {
  const published = await prisma.policy.findMany({
    where: { status: PolicyStatus.PUBLISHED },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      latestVersionNo: true,
      issuingAuthority: true,
      updatedAt: true,
    },
  });

  if (published.length === 0) return [];

  const acks = await prisma.policyAcknowledgement.findMany({
    where: {
      userId,
      policyId: { in: published.map((p) => p.id) },
    },
  });
  const acked = new Set(acks.map((a) => `${a.policyId}:${a.policyVersionNo}`));

  return published.filter((p) => !acked.has(`${p.id}:${p.latestVersionNo}`));
}

export type CreatePolicyInput = {
  title: string;
  issuingAuthority?: string | null;
  content: string;
  status: PolicyStatus;
  effectiveAt?: Date | null;
  updatedById: string;
};

export async function createPolicyWithFirstVersion(input: CreatePolicyInput) {
  const base = slugify(input.title);
  const slug = await ensureUniqueSlug(base);

  const policy = await prisma.$transaction(async (tx) => {
    const p = await tx.policy.create({
      data: {
        title: input.title.trim(),
        slug,
        status: input.status,
        issuingAuthority: input.issuingAuthority?.trim() || null,
        latestVersionNo: 1,
        versions: {
          create: {
            versionNo: 1,
            content: input.content,
            effectiveAt: input.effectiveAt ?? null,
            issuedAt: input.status === PolicyStatus.PUBLISHED ? new Date() : null,
            updatedById: input.updatedById,
          },
        },
      },
    });
    return p;
  });

  if (input.status === PolicyStatus.PUBLISHED) {
    await notifyUsersPolicyAckRequired(policy.id, policy.latestVersionNo, policy.title);
  }

  return policy;
}

export type AddPolicyVersionInput = {
  policyId: string;
  content: string;
  effectiveAt?: Date | null;
  updatedById: string;
};

/** Append a new published version to an already published policy (triggers acknowledgement). */
export async function addPolicyVersion(input: AddPolicyVersionInput) {
  const policy = await prisma.policy.findUnique({ where: { id: input.policyId } });
  if (!policy) throw new Error("POLICY_NOT_FOUND");
  if (policy.status === PolicyStatus.DRAFT) {
    throw new Error("DRAFT_USE_UPDATE");
  }

  const nextNo = policy.latestVersionNo + 1;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.policyVersion.create({
      data: {
        policyId: input.policyId,
        versionNo: nextNo,
        content: input.content,
        effectiveAt: input.effectiveAt ?? null,
        issuedAt: new Date(),
        updatedById: input.updatedById,
      },
    });

    return tx.policy.update({
      where: { id: input.policyId },
      data: {
        latestVersionNo: nextNo,
        status: PolicyStatus.PUBLISHED,
      },
    });
  });

  await notifyUsersPolicyAckRequired(updated.id, updated.latestVersionNo, updated.title);

  return updated;
}

export async function publishDraftPolicy(policyId: string, updatedById: string) {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
  });

  if (!policy) throw new Error("POLICY_NOT_FOUND");
  if (policy.status !== PolicyStatus.DRAFT) throw new Error("NOT_DRAFT");

  const latest = policy.versions[0];
  if (!latest) throw new Error("NO_VERSION");

  await prisma.$transaction([
    prisma.policyVersion.update({
      where: { id: latest.id },
      data: { issuedAt: new Date(), updatedById },
    }),
    prisma.policy.update({
      where: { id: policyId },
      data: { status: PolicyStatus.PUBLISHED },
    }),
  ]);

  const fresh = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });
  await notifyUsersPolicyAckRequired(fresh.id, fresh.latestVersionNo, fresh.title);
  return fresh;
}

export async function updateDraftPolicyContent(policyId: string, content: string, updatedById: string) {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: { versions: { where: { versionNo: 1 } } },
  });
  if (!policy || policy.status !== PolicyStatus.DRAFT) throw new Error("NOT_DRAFT");
  const v1 = policy.versions[0];
  if (!v1) throw new Error("NO_VERSION");
  await prisma.policyVersion.update({
    where: { id: v1.id },
    data: { content, updatedById },
  });
}

async function notifyUsersPolicyAckRequired(policyId: string, versionNo: number, policyTitle: string) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      status: { not: UserStatus.TERMINATED },
      roles: {
        some: {
          role: {
            permissions: {
              some: { permission: { key: "policies.ack" } },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: NotificationType.POLICY_ACK_REQUIRED,
      title: "Policy acknowledgement required",
      message: `Please read and acknowledge: ${policyTitle} (v${versionNo}).`,
      route: `/policies/${policyId}`,
    })),
  });
}
