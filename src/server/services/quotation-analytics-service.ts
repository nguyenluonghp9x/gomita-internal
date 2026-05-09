import { Prisma, QuotationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Filters for quotation analytics (weekly charts ignore status — see KPI cards for sliced status totals). */
export type QuotationAnalyticsFilters = {
  q?: string;
  ownerId?: string;
  fromDate?: string;
  toDate?: string;
  status?: QuotationStatus;
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

function baseQuotationWhere(filters?: QuotationAnalyticsFilters): Prisma.QuotationWhereInput {
  const q = filters?.q?.trim();
  const ownerId = filters?.ownerId?.trim();
  const from = parseDateStart(filters?.fromDate);
  const to = parseDateEnd(filters?.toDate);
  const status = filters?.status;

  return {
    ...(status ? { status } : {}),
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

/** Trend charts: owner + search + dates, but not status (otherwise \"created\" series collapses). */
function trendQuotationsWhere(filters?: QuotationAnalyticsFilters): Prisma.QuotationWhereInput {
  const { q, ownerId, fromDate, toDate } = filters ?? {};
  return baseQuotationWhere({ q, ownerId, fromDate, toDate });
}

export type WeekBucket = {
  weekStartIso: string;
  created: number;
  wonEvents: number;
  lostEvents: number;
};

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

function utcMondayStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Last `weekCount` Mondays (UTC), oldest first. */
export function buildWeekBuckets(weekCount: number, anchor: Date): Date[] {
  const weeks = Math.min(52, Math.max(4, weekCount));
  const cur = utcMondayStart(anchor);
  const buckets: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push(new Date(cur.getTime() - i * MS_WEEK));
  }
  return buckets;
}

function weekKeyUtcMonday(d: Date): string {
  return utcMondayStart(d).toISOString().slice(0, 10);
}

/**
 * Weekly trend: quotations **created** in week vs **audit** transitions to WON/LOST (scoped to quotations matching trend filters).
 */
export async function getQuotationWeeklyTrend(
  filters: QuotationAnalyticsFilters | undefined,
  weekCount = 12,
): Promise<WeekBucket[]> {
  const anchor = parseDateEnd(filters?.toDate) ?? new Date();
  const buckets = buildWeekBuckets(weekCount, anchor);
  const start = buckets[0]!;
  const endExclusive = new Date(utcMondayStart(anchor));
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);

  const tw = trendQuotationsWhere(filters);

  const [createdRows, auditCandidates] = await Promise.all([
    prisma.quotation.findMany({
      where: {
        ...tw,
        createdAt: { gte: start, lt: endExclusive },
      },
      select: { createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: {
        module: "quotations",
        resource: "quotation_status",
        createdAt: { gte: start, lt: endExclusive },
        OR: [
          { metadata: { path: ["targetStatus"], equals: "WON" } },
          { metadata: { path: ["targetStatus"], equals: "LOST" } },
        ],
      },
      select: { createdAt: true, metadata: true, resourceId: true },
    }),
  ]);

  const candidateIds = [
    ...new Set(
      auditCandidates
        .map((a) => a.resourceId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const allowed =
    candidateIds.length === 0
      ? []
      : await prisma.quotation.findMany({
          where: { id: { in: candidateIds }, ...tw },
          select: { id: true },
        });
  const allowedSet = new Set(allowed.map((r) => r.id));

  const auditRows = auditCandidates.filter(
    (a) => typeof a.resourceId === "string" && allowedSet.has(a.resourceId),
  );

  const createdMap = new Map<string, number>();
  for (const row of createdRows) {
    const k = weekKeyUtcMonday(row.createdAt);
    createdMap.set(k, (createdMap.get(k) ?? 0) + 1);
  }

  const wonMap = new Map<string, number>();
  const lostMap = new Map<string, number>();
  for (const row of auditRows) {
    const meta = row.metadata as { targetStatus?: string } | null;
    const t = meta?.targetStatus;
    if (t !== "WON" && t !== "LOST") continue;
    const k = weekKeyUtcMonday(row.createdAt);
    if (t === "WON") wonMap.set(k, (wonMap.get(k) ?? 0) + 1);
    else lostMap.set(k, (lostMap.get(k) ?? 0) + 1);
  }

  return buckets.map((b) => {
    const key = b.toISOString().slice(0, 10);
    return {
      weekStartIso: key,
      created: createdMap.get(key) ?? 0,
      wonEvents: wonMap.get(key) ?? 0,
      lostEvents: lostMap.get(key) ?? 0,
    };
  });
}

export type ProjectOutcomeRow = {
  projectType: string;
  won: number;
  lost: number;
};

/** Won vs lost counts by project type (`updatedAt` within filter hints last activity window). */
export async function getOutcomesByProjectType(
  filters: QuotationAnalyticsFilters | undefined,
): Promise<ProjectOutcomeRow[]> {
  const status = filters?.status;
  if (
    status &&
    status !== QuotationStatus.WON &&
    status !== QuotationStatus.LOST
  ) {
    return [];
  }

  const statusClause: Pick<Prisma.QuotationWhereInput, "status"> =
    status === QuotationStatus.WON || status === QuotationStatus.LOST
      ? { status }
      : { status: { in: [QuotationStatus.WON, QuotationStatus.LOST] } };

  const rows = await prisma.quotation.groupBy({
    by: ["projectType", "status"],
    where: {
      ...statusClause,
      ...(filters?.ownerId?.trim()
        ? { createdById: filters.ownerId.trim() }
        : {}),
      ...(parseDateStart(filters?.fromDate) || parseDateEnd(filters?.toDate)
        ? {
            updatedAt: {
              ...(parseDateStart(filters?.fromDate) ? { gte: parseDateStart(filters?.fromDate) } : {}),
              ...(parseDateEnd(filters?.toDate) ? { lte: parseDateEnd(filters?.toDate) } : {}),
            },
          }
        : {}),
      ...(filters?.q?.trim()
        ? {
            OR: [
              { code: { contains: filters.q.trim(), mode: "insensitive" } },
              { customerName: { contains: filters.q.trim(), mode: "insensitive" } },
              { projectType: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    _count: { _all: true },
    orderBy: { projectType: "asc" },
  });

  const map = new Map<string, ProjectOutcomeRow>();
  for (const row of rows) {
    const key = row.projectType || "(empty)";
    const prev = map.get(key) ?? { projectType: key, won: 0, lost: 0 };
    const next = { ...prev };
    if (row.status === QuotationStatus.WON) next.won = row._count._all;
    if (row.status === QuotationStatus.LOST) next.lost = row._count._all;
    map.set(key, next);
  }

  const list = [...map.values()].filter((x) => x.won + x.lost > 0);
  list.sort((a, b) => b.won + b.lost - (a.won + a.lost));
  return list.slice(0, 12);
}

export type OwnerWinLeader = {
  userId: string;
  fullName: string | null;
  email: string;
  wonCount: number;
  wonTotal: number;
};

export async function getOwnerWinLeaderboard(
  filters: QuotationAnalyticsFilters | undefined,
  take = 8,
): Promise<OwnerWinLeader[]> {
  const grouped = await prisma.quotation.groupBy({
    by: ["createdById"],
    where: {
      status: QuotationStatus.WON,
      ...(filters?.ownerId?.trim() ? { createdById: filters.ownerId.trim() } : {}),
      ...(parseDateStart(filters?.fromDate) || parseDateEnd(filters?.toDate)
        ? {
            updatedAt: {
              ...(parseDateStart(filters?.fromDate) ? { gte: parseDateStart(filters?.fromDate) } : {}),
              ...(parseDateEnd(filters?.toDate) ? { lte: parseDateEnd(filters?.toDate) } : {}),
            },
          }
        : {}),
      ...(filters?.q?.trim()
        ? {
            OR: [
              { code: { contains: filters.q.trim(), mode: "insensitive" } },
              { customerName: { contains: filters.q.trim(), mode: "insensitive" } },
              { projectType: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    _count: { _all: true },
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.createdById) } },
    select: { id: true, fullName: true, email: true },
  });
  const umap = new Map(users.map((u) => [u.id, u]));

  return grouped.map((g) => {
    const u = umap.get(g.createdById);
    return {
      userId: g.createdById,
      fullName: u?.fullName ?? null,
      email: u?.email ?? "",
      wonCount: g._count._all,
      wonTotal: Number(g._sum.totalAmount ?? 0),
    };
  });
}
