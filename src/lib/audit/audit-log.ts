import { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditPayload = {
  actorId?: string;
  action: AuditAction;
  module: string;
  resource: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({ data: payload });
}
