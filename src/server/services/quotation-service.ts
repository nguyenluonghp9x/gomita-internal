import {
  ApprovalStatus,
  NotificationType,
  Prisma,
  QuotationStatus,
  UserStatus,
} from "@prisma/client";

import { type SnapshotPayload } from "@/lib/quotation/compute";
import { quotationStatusLabel } from "@/lib/quotation/status";
import { QUOTATION_DISCOUNT_APPROVAL_THRESHOLD } from "@/lib/constants/quotation";
import { prisma } from "@/lib/prisma";

export type { QuotationLineInput, SnapshotPayload } from "@/lib/quotation/compute";
export { buildLineRows, buildSnapshot, computeTotalsFromLines } from "@/lib/quotation/compute";

export type QuotationQueryFilters = {
  status?: QuotationStatus;
  q?: string;
  ownerId?: string;
  fromDate?: string;
  toDate?: string;
};

function parseDateStart(raw?: string): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateEnd(raw?: string): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildQuotationWhere(filters?: QuotationQueryFilters): Prisma.QuotationWhereInput {
  const q = filters?.q?.trim();
  const ownerId = filters?.ownerId?.trim();
  const from = parseDateStart(filters?.fromDate);
  const to = parseDateEnd(filters?.toDate);

  return {
    ...(filters?.status ? { status: filters.status } : {}),
    ...(ownerId ? { createdById: ownerId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { projectType: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function prismaDecimals(snapshot: SnapshotPayload) {
  const t = snapshot.totals;
  return {
    subtotal: String(t.subtotal),
    vatAmount: String(t.vatAmount),
    totalAmount: String(t.totalAmount),
    estimatedCost: String(t.estimatedCost),
    expectedProfit: String(t.expectedProfit),
    marginPercent: String(t.marginPercent),
    discountPercent: String(snapshot.discountPercent),
  };
}

export async function generateQuotationCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BG-${year}-`;
  const existing = await prisma.quotation.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let maxSeq = 0;
  for (const row of existing) {
    const suffix = row.code.replace(prefix, "");
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export async function listQuotationTemplates() {
  return prisma.quotationTemplate.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function listActiveFormulaConfigs() {
  return prisma.quotationFormulaConfig.findMany({
    orderBy: { changedAt: "desc" },
    take: 12,
  });
}

export async function listQuotations(filters?: QuotationQueryFilters) {
  const where = buildQuotationWhere(filters);
  return prisma.quotation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { fullName: true, email: true } },
      template: { select: { name: true, code: true } },
      approvals: {
        where: { status: ApprovalStatus.PENDING },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function listQuotationsPaged(
  filters?: QuotationQueryFilters & { page?: number; pageSize?: number },
) {
  const where = buildQuotationWhere(filters);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));
  const page = Math.max(1, filters?.page ?? 1);
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        createdBy: { select: { fullName: true, email: true } },
        template: { select: { name: true, code: true } },
        approvals: {
          where: { status: ApprovalStatus.PENDING },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getQuotationPipelineStats() {
  const grouped = await prisma.quotation.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const byStatus: Record<QuotationStatus, number> = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    SENT: 0,
    NEGOTIATING: 0,
    WON: 0,
    LOST: 0,
  };

  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }

  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  return { total, byStatus };
}

export async function getQuotationPipelineStatsFiltered(filters?: QuotationQueryFilters) {
  const where = buildQuotationWhere(filters);
  const grouped = await prisma.quotation.groupBy({
    where,
    by: ["status"],
    _count: { _all: true },
  });

  const byStatus: Record<QuotationStatus, number> = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    SENT: 0,
    NEGOTIATING: 0,
    WON: 0,
    LOST: 0,
  };

  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }

  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  return { total, byStatus };
}

export async function getQuotationPipelineHealth(filters?: QuotationQueryFilters) {
  const where = buildQuotationWhere(filters);
  const [all, wonRows, lostRows] = await Promise.all([
    prisma.quotation.findMany({
      where,
      select: {
        status: true,
        totalAmount: true,
        discountPercent: true,
      },
    }),
    prisma.quotation.findMany({
      where: { ...where, status: QuotationStatus.WON },
      select: { totalAmount: true },
    }),
    prisma.quotation.findMany({
      where: { ...where, status: QuotationStatus.LOST },
      select: { totalAmount: true },
    }),
  ]);

  const totalCount = all.length;
  const wonCount = wonRows.length;
  const lostCount = lostRows.length;
  const closedCount = wonCount + lostCount;

  const sumClosedValue = [...wonRows, ...lostRows].reduce(
    (s, r) => s + Number(r.totalAmount),
    0,
  );
  const sumWonValue = wonRows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const sumLostValue = lostRows.reduce((s, r) => s + Number(r.totalAmount), 0);

  const avgDiscountAllPct =
    totalCount === 0
      ? 0
      : (all.reduce((s, r) => s + Number(r.discountPercent), 0) / totalCount) * 100;

  return {
    totalCount,
    wonCount,
    lostCount,
    closedCount,
    winRatePct: closedCount === 0 ? 0 : (wonCount / closedCount) * 100,
    lossRatePct: closedCount === 0 ? 0 : (lostCount / closedCount) * 100,
    avgClosedDealValue: closedCount === 0 ? 0 : sumClosedValue / closedCount,
    avgWonDealValue: wonCount === 0 ? 0 : sumWonValue / wonCount,
    avgLostDealValue: lostCount === 0 ? 0 : sumLostValue / lostCount,
    avgDiscountAllPct,
  };
}

export async function listQuotationOwners() {
  return prisma.user.findMany({
    where: {
      quotations: { some: {} },
      isActive: true,
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getQuotationById(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      createdBy: { select: { fullName: true, email: true } },
      template: true,
      formulaConfig: true,
      versions: { orderBy: { versionNo: "desc" }, take: 3 },
      approvals: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export async function getQuotationStatusTimeline(quotationId: string) {
  const rows = await prisma.auditLog.findMany({
    where: {
      module: "quotations",
      resourceId: quotationId,
      OR: [
        { action: "CREATE_QUOTATION" },
        { action: "APPROVE_QUOTATION" },
        { resource: "quotation_status" },
        { metadata: { path: ["action"], equals: "submit" } },
        { metadata: { path: ["action"], equals: "reject" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      actor: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((row) => {
    const metadata = (row.metadata ?? null) as Record<string, unknown> | null;
    const actionTag = typeof metadata?.action === "string" ? metadata.action : null;
    const targetStatus = typeof metadata?.targetStatus === "string" ? metadata.targetStatus : null;

    let label = `${row.action} (${row.resource})`;
    if (actionTag === "submit") label = "Submitted for review";
    if (actionTag === "reject") label = "Discount rejected (back to draft)";
    if (row.action === "APPROVE_QUOTATION") label = "Discount approved";
    if (row.action === "CREATE_QUOTATION") label = "Quotation created";
    if (row.resource === "quotation_status" && targetStatus) {
      label = `Status changed to ${quotationStatusLabel(targetStatus)}`;
    }

    return {
      id: row.id,
      label,
      actorName: row.actor?.fullName ?? "System",
      actorEmail: row.actor?.email ?? "",
      createdAt: row.createdAt,
    };
  });
}

export async function createQuotationWithItems(input: {
  snapshot: SnapshotPayload;
  templateId?: string | null;
  formulaConfigId?: string | null;
  createdById: string;
}) {
  const code = await generateQuotationCode();
  const dec = prismaDecimals(input.snapshot);

  return prisma.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: {
        code,
        customerName: input.snapshot.customerName,
        projectType: input.snapshot.projectType,
        scope: input.snapshot.scope,
        notes: input.snapshot.notes,
        discountPercent: dec.discountPercent,
        discountReason: input.snapshot.discountReason,
        status: QuotationStatus.DRAFT,
        subtotal: dec.subtotal,
        vatAmount: dec.vatAmount,
        totalAmount: dec.totalAmount,
        estimatedCost: dec.estimatedCost,
        expectedProfit: dec.expectedProfit,
        marginPercent: dec.marginPercent,
        templateId: input.templateId || null,
        formulaConfigId: input.formulaConfigId || null,
        createdById: input.createdById,
        items: {
          create: input.snapshot.items.map((i) => ({
            name: i.name,
            description: i.description,
            quantity: String(i.quantity),
            unit: i.unit,
            unitPrice: String(i.unitPrice),
            lineTotal: String(i.lineTotal),
            estimatedCost: String(i.estimatedCost),
            projectedProfit: String(i.projectedProfit),
          })),
        },
      },
    });

    await tx.quotationVersion.create({
      data: {
        quotationId: q.id,
        versionNo: 1,
        isFinal: false,
        snapshotJson: input.snapshot as unknown as Prisma.InputJsonValue,
        createdById: input.createdById,
      },
    });

    return q;
  });
}

export async function updateQuotationDraft(input: {
  quotationId: string;
  snapshot: SnapshotPayload;
  templateId?: string | null;
  formulaConfigId?: string | null;
  actorId: string;
}) {
  const dec = prismaDecimals(input.snapshot);

  await prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: input.quotationId } });
    await tx.quotation.update({
      where: { id: input.quotationId },
      data: {
        customerName: input.snapshot.customerName,
        projectType: input.snapshot.projectType,
        scope: input.snapshot.scope,
        notes: input.snapshot.notes,
        discountPercent: dec.discountPercent,
        discountReason: input.snapshot.discountReason,
        subtotal: dec.subtotal,
        vatAmount: dec.vatAmount,
        totalAmount: dec.totalAmount,
        estimatedCost: dec.estimatedCost,
        expectedProfit: dec.expectedProfit,
        marginPercent: dec.marginPercent,
        templateId: input.templateId ?? null,
        formulaConfigId: input.formulaConfigId ?? null,
        items: {
          create: input.snapshot.items.map((i) => ({
            name: i.name,
            description: i.description,
            quantity: String(i.quantity),
            unit: i.unit,
            unitPrice: String(i.unitPrice),
            lineTotal: String(i.lineTotal),
            estimatedCost: String(i.estimatedCost),
            projectedProfit: String(i.projectedProfit),
          })),
        },
      },
    });

    await tx.quotationVersion.upsert({
      where: {
        quotationId_versionNo: {
          quotationId: input.quotationId,
          versionNo: 1,
        },
      },
      create: {
        quotationId: input.quotationId,
        versionNo: 1,
        isFinal: false,
        snapshotJson: input.snapshot as unknown as Prisma.InputJsonValue,
        createdById: input.actorId,
      },
      update: {
        snapshotJson: input.snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  });
}

function needsDiscountApproval(discountPercent: number): boolean {
  return discountPercent > QUOTATION_DISCOUNT_APPROVAL_THRESHOLD;
}

export async function getUsersWhoCanApproveQuotations() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      status: { not: UserStatus.TERMINATED },
      roles: {
        some: {
          role: {
            permissions: {
              some: { permission: { key: "quotations.approve_discount" } },
            },
          },
        },
      },
    },
    select: { id: true },
  });
}

export async function notifyQuotationApprovalRequested(params: {
  quotationId: string;
  code: string;
  customerName: string;
}) {
  const users = await getUsersWhoCanApproveQuotations();
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: NotificationType.QUOTATION_APPROVAL_REQUEST,
      title: "Quotation pending approval",
      message: `${params.code} — ${params.customerName} needs discount approval.`,
      route: `/quotations/${params.quotationId}`,
    })),
  });
}

export async function submitQuotationForReview(params: {
  quotationId: string;
  actorId: string;
  snapshot: SnapshotPayload;
}) {
  const requiresApproval = needsDiscountApproval(params.snapshot.discountPercent);

  await prisma.$transaction(async (tx) => {
    const dec = prismaDecimals(params.snapshot);

    await tx.quotationItem.deleteMany({ where: { quotationId: params.quotationId } });
    await tx.quotation.update({
      where: { id: params.quotationId },
      data: {
        customerName: params.snapshot.customerName,
        projectType: params.snapshot.projectType,
        scope: params.snapshot.scope,
        notes: params.snapshot.notes,
        discountPercent: dec.discountPercent,
        discountReason: params.snapshot.discountReason,
        subtotal: dec.subtotal,
        vatAmount: dec.vatAmount,
        totalAmount: dec.totalAmount,
        estimatedCost: dec.estimatedCost,
        expectedProfit: dec.expectedProfit,
        marginPercent: dec.marginPercent,
        status: requiresApproval ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.APPROVED,
        items: {
          create: params.snapshot.items.map((i) => ({
            name: i.name,
            description: i.description,
            quantity: String(i.quantity),
            unit: i.unit,
            unitPrice: String(i.unitPrice),
            lineTotal: String(i.lineTotal),
            estimatedCost: String(i.estimatedCost),
            projectedProfit: String(i.projectedProfit),
          })),
        },
      },
    });

    const vCount = await tx.quotationVersion.count({ where: { quotationId: params.quotationId } });
    const nextV = vCount + 1;
    await tx.quotationVersion.create({
      data: {
        quotationId: params.quotationId,
        versionNo: nextV,
        isFinal: !requiresApproval,
        snapshotJson: params.snapshot as unknown as Prisma.InputJsonValue,
        createdById: params.actorId,
      },
    });

    if (requiresApproval) {
      await tx.quotationApproval.updateMany({
        where: {
          quotationId: params.quotationId,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: ApprovalStatus.REJECTED,
          decisionAt: new Date(),
          decisionNote: "Superseded by a newer submission",
        },
      });

      await tx.quotationApproval.create({
        data: {
          quotationId: params.quotationId,
          requestedById: params.actorId,
          discountThreshold: String(QUOTATION_DISCOUNT_APPROVAL_THRESHOLD),
          requestedDiscount: dec.discountPercent,
          reason: params.snapshot.discountReason,
          status: ApprovalStatus.PENDING,
        },
      });
    }
  });

  if (requiresApproval) {
    const q = await prisma.quotation.findUnique({
      where: { id: params.quotationId },
      select: { code: true, customerName: true },
    });
    if (q) {
      await notifyQuotationApprovalRequested({
        quotationId: params.quotationId,
        code: q.code,
        customerName: q.customerName,
      });
    }
  }
}

export async function approveQuotationDiscount(params: {
  quotationId: string;
  approverId: string;
  note?: string | null;
}) {
  const q = await prisma.quotation.findUnique({
    where: { id: params.quotationId },
    include: {
      approvals: {
        where: { status: ApprovalStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!q) throw new Error("NOT_FOUND");
  if (q.status !== QuotationStatus.PENDING_APPROVAL) throw new Error("INVALID_STATUS");

  const pending = q.approvals[0];
  if (!pending) throw new Error("NO_PENDING_APPROVAL");

  await prisma.$transaction([
    prisma.quotationApproval.update({
      where: { id: pending.id },
      data: {
        status: ApprovalStatus.APPROVED,
        approverId: params.approverId,
        decisionAt: new Date(),
        decisionNote: params.note?.trim() || null,
      },
    }),
    prisma.quotation.update({
      where: { id: params.quotationId },
      data: { status: QuotationStatus.APPROVED },
    }),
  ]);

  await prisma.notification.create({
    data: {
      userId: q.createdById,
      type: NotificationType.QUOTATION_APPROVED,
      title: "Quotation approved",
      message: `${q.code} has been approved.`,
      route: `/quotations/${q.id}`,
    },
  });
}

export async function rejectQuotationDiscount(params: {
  quotationId: string;
  approverId: string;
  note?: string | null;
}) {
  const q = await prisma.quotation.findUnique({
    where: { id: params.quotationId },
    include: {
      approvals: {
        where: { status: ApprovalStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!q) throw new Error("NOT_FOUND");
  if (q.status !== QuotationStatus.PENDING_APPROVAL) throw new Error("INVALID_STATUS");

  const pending = q.approvals[0];
  if (!pending) throw new Error("NO_PENDING_APPROVAL");

  await prisma.$transaction([
    prisma.quotationApproval.update({
      where: { id: pending.id },
      data: {
        status: ApprovalStatus.REJECTED,
        approverId: params.approverId,
        decisionAt: new Date(),
        decisionNote: params.note?.trim() || null,
      },
    }),
    prisma.quotation.update({
      where: { id: params.quotationId },
      data: { status: QuotationStatus.DRAFT },
    }),
  ]);

  await prisma.notification.create({
    data: {
      userId: q.createdById,
      type: NotificationType.QUOTATION_REJECTED,
      title: "Quotation rejected",
      message: `${q.code} was rejected. Revise discount or scope and resubmit.`,
      route: `/quotations/${q.id}`,
    },
  });
}

const ALLOWED_STATUS_TRANSITIONS: Partial<Record<QuotationStatus, QuotationStatus[]>> = {
  APPROVED: ["SENT", "NEGOTIATING", "WON", "LOST"],
  SENT: ["NEGOTIATING", "WON", "LOST"],
  NEGOTIATING: ["WON", "LOST"],
};

export async function transitionQuotationStatus(params: {
  quotationId: string;
  targetStatus: QuotationStatus;
}) {
  const q = await prisma.quotation.findUnique({
    where: { id: params.quotationId },
    select: { id: true, status: true },
  });
  if (!q) throw new Error("NOT_FOUND");

  if (q.status === params.targetStatus) return q;

  const nextAllowed = ALLOWED_STATUS_TRANSITIONS[q.status] ?? [];
  if (!nextAllowed.includes(params.targetStatus)) {
    throw new Error("INVALID_TRANSITION");
  }

  return prisma.quotation.update({
    where: { id: q.id },
    data: { status: params.targetStatus },
    select: { id: true, status: true },
  });
}
