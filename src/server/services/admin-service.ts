import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { listUsersRequiringPolicyAck } from "@/server/services/audit-log-service";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";

export async function getAdminDashboardStats() {
  const [totalUsers, newUsers, totalEnrollments, completedEnrollments, newDocuments, pendingQuotations, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { completedAt: { not: null } } }),
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.quotation.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { fullName: true, email: true } } },
      }),
    ]);

  const publishedPolicies = await prisma.policy.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, latestVersionNo: true },
  });
  const mustAckUsers = await listUsersRequiringPolicyAck();
  const mustAckIds = new Set(mustAckUsers.map((u) => u.id));

  let pendingPolicyAcknowledgements = 0;
  if (mustAckIds.size > 0 && publishedPolicies.length > 0) {
    const uidList = [...mustAckIds];
    for (const policy of publishedPolicies) {
      const ackRows = await prisma.policyAcknowledgement.findMany({
        where: {
          policyId: policy.id,
          policyVersionNo: policy.latestVersionNo,
          userId: { in: uidList },
        },
        select: { userId: true },
      });
      const acked = new Set(ackRows.map((a) => a.userId));
      for (const uid of mustAckIds) {
        if (!acked.has(uid)) pendingPolicyAcknowledgements += 1;
      }
    }
  }

  return {
    totalUsers,
    newUsers,
    trainingCompletionRate: totalEnrollments === 0 ? 0 : Math.round((completedEnrollments / totalEnrollments) * 100),
    newDocuments,
    pendingPolicyAcknowledgements,
    pendingQuotations,
    recentAudit,
  };
}

export async function getUsersList() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      department: true,
      roles: {
        include: { role: true },
      },
    },
  });
}

export async function getRolesList() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: {
        include: { permission: true },
      },
      users: true,
    },
  });
}

export async function getPermissionsList() {
  return prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });
}

export async function getUserFormMeta() {
  const [departments, roles] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { departments, roles };
}

export async function createUser(input: CreateUserInput) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    return { ok: false, message: "Email đã tồn tại trong hệ thống" };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      passwordHash,
      phoneNumber: parsed.data.phoneNumber || null,
      title: parsed.data.title || null,
      departmentId: parsed.data.departmentId,
      status: "ACTIVE",
      roles: {
        create: [{ roleId: parsed.data.roleId }],
      },
    },
  });

  return { ok: true, userId: user.id, message: "Tạo user thành công" };
}
