import { AuditAction, Prisma, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const AUDIT_LOG_PAGE_SIZE = 50;

export type AuditLogListFilters = {
  q?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
};

function parseAction(raw?: string): AuditAction | undefined {
  if (!raw?.trim()) return undefined;
  const values = Object.values(AuditAction) as string[];
  return values.includes(raw) ? (raw as AuditAction) : undefined;
}

export async function listAuditLogs(filters: AuditLogListFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const skip = (page - 1) * AUDIT_LOG_PAGE_SIZE;

  const q = filters.q?.trim();
  const moduleQ = filters.module?.trim();
  const action = parseAction(filters.action);

  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (moduleQ) {
    andConditions.push({ module: { contains: moduleQ, mode: "insensitive" } });
  }
  if (action) {
    andConditions.push({ action });
  }
  if (filters.from?.trim() || filters.to?.trim()) {
    const range: Prisma.DateTimeFilter = {};
    if (filters.from?.trim()) {
      range.gte = new Date(filters.from);
    }
    if (filters.to?.trim()) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    andConditions.push({ createdAt: range });
  }
  if (q) {
    andConditions.push({
      OR: [
        { resource: { contains: q, mode: "insensitive" } },
        { resourceId: { contains: q, mode: "insensitive" } },
        { module: { contains: q, mode: "insensitive" } },
        { actor: { is: { fullName: { contains: q, mode: "insensitive" } } } },
        { actor: { is: { email: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: AUDIT_LOG_PAGE_SIZE,
      include: {
        actor: { select: { fullName: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LOG_PAGE_SIZE));

  return {
    rows,
    total,
    page,
    pageSize: AUDIT_LOG_PAGE_SIZE,
    totalPages,
  };
}

/** Users who must acknowledge published policies (same rule as notifications). */
export async function listUsersRequiringPolicyAck() {
  return prisma.user.findMany({
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
}
